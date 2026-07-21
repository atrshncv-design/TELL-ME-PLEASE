"""WebSocket endpoint for voice AI chat.

Protocol:
  Client → Server (JSON):
    {"branch_id": "7"}          — sent once on connect
    {"text": "Hello teacher"}   — user speech transcription
  Server → Client (JSON):
    {"type": "token",   "content": "H"}           — streaming token
    {"type": "sentence", "content": "Hello."}     — complete sentence (ready for TTS)
    {"type": "audio",   "content": "<base64>"}   — audio chunk from Kokoro
    {"type": "done"}                               — response complete
    {"type": "session_ended"}                      — 3-minute timeout reached
    {"type": "error",   "content": "..."}         — error message
"""

from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.config import settings
from app.services.context_window import ContextWindow
from app.services.key_rotation import KeyRotationManager
from app.services.llm import stream_llm_response
from app.services.prompt_router import resolve_prompt
from app.services.tts import synthesize_speech

logger = logging.getLogger(__name__)
router = APIRouter()

key_manager = KeyRotationManager(settings.api_keys)

SENTENCE_DELIMITERS = set(".!?")


async def _tts_and_send(websocket: WebSocket, text: str) -> None:
    """Synthesize speech and send audio back to client."""
    audio_b64 = await synthesize_speech(text)
    if audio_b64:
        try:
            await websocket.send_json({"type": "audio", "content": audio_b64})
        except Exception:
            logger.debug("Could not send audio (client may have disconnected)")


async def _stream_and_buffer(
    websocket: WebSocket,
    messages: list[dict],
    branch_id: str,
    tts_tasks: list[asyncio.Task],
    system_prompt: str | None = None,
) -> str:
    """Stream LLM response, buffer sentences, fire TTS. Returns full reply text."""
    sentence_buf = ""
    full_reply = ""

    async for token in stream_llm_response(
        messages, branch_id, key_manager, system_prompt=system_prompt
    ):
        await websocket.send_json({"type": "token", "content": token})
        sentence_buf += token
        full_reply += token

        if sentence_buf and sentence_buf[-1] in SENTENCE_DELIMITERS:
            sentence = sentence_buf.strip()
            sentence_buf = ""
            tts_tasks.append(
                asyncio.create_task(_tts_and_send(websocket, sentence))
            )

    if sentence_buf.strip():
        tts_tasks.append(
            asyncio.create_task(_tts_and_send(websocket, sentence_buf.strip()))
        )

    return full_reply


@router.websocket("/ws/chat")
async def chat_ws(websocket: WebSocket):
    await websocket.accept()

    ctx = ContextWindow(max_turns=settings.max_context_turns)
    branch_id = "7"
    tts_tasks: list[asyncio.Task] = []
    session_expired = False

    try:
        init = await websocket.receive_text()
        data = json.loads(init)
        branch_id = data.get("branch_id", "7")
        logger.info("WS connected: branch_id=%s", branch_id)
    except Exception:
        pass

    async def _session_timer() -> None:
        """Wait for session timeout, then signal expiry."""
        nonlocal session_expired
        await asyncio.sleep(settings.session_timeout_seconds)
        session_expired = True
        logger.info("Session timeout for branch_id=%s", branch_id)

    timer_task = asyncio.create_task(_session_timer())

    try:
        while not session_expired:
            # Use wait_for to break out of receive on timeout
            try:
                raw = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=0.5,
                )
            except asyncio.TimeoutError:
                continue

            data = json.loads(raw)
            user_text = data.get("text", "").strip()

            if not user_text:
                continue

            ctx.add_user(user_text)

            full_reply = await _stream_and_buffer(
                websocket, ctx.messages, branch_id, tts_tasks
            )

            if tts_tasks:
                await asyncio.gather(*tts_tasks, return_exceptions=True)
                tts_tasks.clear()

            ctx.add_assistant(full_reply)
            await websocket.send_json({"type": "done"})

        # --- Session expired: send final feedback ---
        logger.info("Sending final feedback for branch_id=%s", branch_id)
        final_prompt = resolve_prompt("final_feedback")
        ctx.add_user("[SESSION_END] Please say goodbye and give feedback.")

        full_reply = await _stream_and_buffer(
            websocket,
            ctx.messages,
            branch_id,
            tts_tasks,
            system_prompt=final_prompt,
        )

        if tts_tasks:
            await asyncio.gather(*tts_tasks, return_exceptions=True)
            tts_tasks.clear()

        ctx.add_assistant(full_reply)
        await websocket.send_json({"type": "session_ended"})

    except WebSocketDisconnect:
        logger.info("WS disconnected: branch_id=%s", branch_id)
    except Exception as exc:
        logger.exception("WS error: %s", exc)
        try:
            await websocket.send_json({"type": "error", "content": str(exc)})
        except Exception:
            pass
    finally:
        timer_task.cancel()
        for t in tts_tasks:
            t.cancel()
