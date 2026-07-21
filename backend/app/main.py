"""FastAPI app with WebSocket chat, sentence buffer, TTS, and session timer."""

from __future__ import annotations

import asyncio
import json
import logging

import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from app.core.config import settings
from app.services.context_window import ContextWindow
from app.services.key_rotation import KeyRotationManager
from app.services.prompt_router import resolve_prompt
from app.services.tts import synthesize

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Tell Me Please API")

key_manager = KeyRotationManager(settings.api_keys)


@app.get("/")
def read_root():
    return {"message": "Tell Me Please API is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


async def _tts_and_send(ws: WebSocket, text: str) -> None:
    audio = await synthesize(text)
    if audio:
        try:
            await ws.send_json({"type": "audio", "content": audio})
        except Exception:
            pass


async def _stream_response(
    ws: WebSocket,
    messages: list[dict],
    branch_id: str,
    tts_tasks: list[asyncio.Task],
    system_prompt: str | None = None,
) -> str:
    prompt = system_prompt or resolve_prompt(branch_id)
    payload = {
        "model": settings.llm_model,
        "messages": [{"role": "system", "content": prompt}] + messages,
        "stream": True,
    }
    url = f"{settings.llm_api_base}/chat/completions"

    sentence_buf = ""
    full_reply = ""

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await key_manager.send(client, url, payload)
        async for line in resp.aiter_lines():
            if not line.startswith("data: ") or line == "data: [DONE]":
                continue
            chunk = json.loads(line[6:])
            delta = chunk["choices"][0].get("delta", {})
            token = delta.get("content", "")
            if not token:
                continue

            await ws.send_json({"type": "token", "content": token})
            sentence_buf += token
            full_reply += token

            if sentence_buf and sentence_buf[-1] in set(".!?"):
                sent = sentence_buf.strip()
                sentence_buf = ""
                tts_tasks.append(
                    asyncio.create_task(_tts_and_send(ws, sent))
                )

    if sentence_buf.strip():
        tts_tasks.append(
            asyncio.create_task(_tts_and_send(ws, sentence_buf.strip()))
        )

    return full_reply


@app.websocket("/ws/chat")
async def ws_chat(websocket: WebSocket):
    await websocket.accept()
    ctx = ContextWindow(max_turns=settings.max_turns)
    branch_id = "7"
    tts_tasks: list[asyncio.Task] = []
    session_expired = False

    try:
        init = await websocket.receive_text()
        data = json.loads(init)
        branch_id = data.get("branch_id", "7")
        logger.info("WS connected: branch=%s", branch_id)
    except Exception:
        pass

    async def _session_timer() -> None:
        nonlocal session_expired
        await asyncio.sleep(settings.session_timeout)
        session_expired = True
        logger.info("Session timeout: branch=%s", branch_id)

    timer_task = asyncio.create_task(_session_timer())

    try:
        while not session_expired:
            try:
                raw = await asyncio.wait_for(
                    websocket.receive_text(), timeout=0.5
                )
            except asyncio.TimeoutError:
                continue

            data = json.loads(raw)
            user_text = data.get("text", "").strip()
            if not user_text:
                continue

            ctx.add_user(user_text)

            full_reply = await _stream_response(
                websocket, ctx.messages, branch_id, tts_tasks
            )

            if tts_tasks:
                await asyncio.gather(*tts_tasks, return_exceptions=True)
                tts_tasks.clear()

            ctx.add_assistant(full_reply)
            await websocket.send_json({"type": "done"})

        logger.info("Final feedback: branch=%s", branch_id)
        final_prompt = resolve_prompt("final_feedback")
        ctx.add_user("[SESSION_END] Please say goodbye and give feedback.")

        full_reply = await _stream_response(
            websocket, ctx.messages, branch_id, tts_tasks,
            system_prompt=final_prompt,
        )

        if tts_tasks:
            await asyncio.gather(*tts_tasks, return_exceptions=True)
            tts_tasks.clear()

        ctx.add_assistant(full_reply)
        await websocket.send_json({"type": "session_ended"})

    except WebSocketDisconnect:
        logger.info("WS disconnected: branch=%s", branch_id)
    except Exception as exc:
        logger.exception("WS error: %s", exc)
    finally:
        timer_task.cancel()
        for t in tts_tasks:
            t.cancel()
