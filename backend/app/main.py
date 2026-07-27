"""FastAPI app with WebSocket chat, sentence buffer, TTS, and session timer."""

from __future__ import annotations

import asyncio
import json
import logging
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx
from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.analytics import ALLOWED_EVENT_TYPES, count_events, record_event
from app.services.context_window import ContextWindow
from app.services.key_rotation import KeyRotationManager
from app.services.prompt_router import resolve_prompt
from app.services.tts import synthesize

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Tell Me Please API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

key_manager = KeyRotationManager(settings.api_keys)


# --- Admin auth gate (decision Q13) -----------------------------------------
# /admin/* is protected by HTTP Basic Auth. The password lives ONLY in the
# local gitignored .env (settings.admin_password) — never in code, never in
# the DB — so SQL injection against the auth layer is irrelevant: there is no
# table to inject against. Username is fixed to `admin` (single admin).
# `secrets.compare_digest` is timing-safe so credential guesses don't leak
# info via response timing. Empty/missing ADMIN_PASSWORD disables admin and
# the gate returns 503 (not 401) so a misconfigured prod can't be brute-forced.
_basic = HTTPBasic(auto_error=True)


def require_admin(
    credentials: HTTPBasicCredentials = Depends(_basic),
) -> bool:
    if not settings.admin_password:
        raise HTTPException(
            status_code=503,
            detail="Admin disabled (no ADMIN_PASSWORD set)",
        )
    is_user_ok = secrets.compare_digest(
        credentials.username.encode(), b"admin"
    )
    is_pass_ok = secrets.compare_digest(
        credentials.password.encode(), settings.admin_password.encode()
    )
    if not (is_user_ok and is_pass_ok):
        raise HTTPException(
            status_code=401,
            detail="Unauthorized",
            headers={"WWW-Authenticate": 'Basic realm="admin"'},
        )
    return True


@app.get("/")
def read_root():
    return {"message": "Tell Me Please API is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/admin/status")
def admin_status(_: bool = Depends(require_admin)):
    """Placeholder for the future teacher dashboard.

    Proves the Basic-Auth gate works end-to-end by returning a simple status
    + total event count (read via the parameter-free count_events() helper).
    The real dashboard (funnel charts, per-task breakdowns, reading events)
    is a future phase; this route just establishes the authenticated surface.
    """
    return {"status": "admin", "event_count": count_events()}


class EventIn(BaseModel):
    """Anonymous funnel event from the frontend.

    `device_session_id` is a random UUID stored in the browser's localStorage
    (T16-fe) — it never identifies a logged-in user. All fields except
    device_session_id and event_type are optional context for the future
    teacher dashboard.
    """

    device_session_id: str = Field(..., min_length=8, max_length=64)
    event_type: str
    grade: Optional[int] = None
    task_id: Optional[str] = None
    section_id: Optional[str] = None
    score: Optional[int] = None
    user_agent: Optional[str] = None
    extra: Optional[Dict[str, Any]] = None


@app.post("/api/event")
async def record_event_endpoint(ev: EventIn):
    """Receive an anonymous funnel event and store it in SQLite.

    Public-write for now (gated by admin auth in T17). The frontend hook is
    fire-and-forget and must never block the UX. SQL injection is impossible:
    record_event uses parameterized `?` placeholders only.
    """
    if ev.event_type not in ALLOWED_EVENT_TYPES:
        raise HTTPException(
            status_code=400, detail=f"Unknown event_type: {ev.event_type}"
        )
    ts = datetime.now(timezone.utc).isoformat()
    record_event(
        ts=ts,
        device_session_id=ev.device_session_id,
        event_type=ev.event_type,
        grade=ev.grade,
        task_id=ev.task_id,
        section_id=ev.section_id,
        score=ev.score,
        user_agent=ev.user_agent,
        extra=json.dumps(ev.extra) if ev.extra else None,
    )
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
    base_messages = [{"role": "system", "content": prompt}] + messages
    url = f"{settings.llm_api_base}/chat/completions"

    # MODEL-level fallback (T2). Free OpenCode Zen models are UNSTABLE: ~50%
    # of calls return an EMPTY `content` (benchmark in T1/bd23c8e). We try each
    # model in settings.get_models() order; if one returns empty content we
    # retry with the next. This is SEPARATE from key rotation (which cycles
    # API KEYS on 429/403 inside key_manager.send_stream).
    #
    # Retry policy: we only retry when the accumulated reply is TRULY empty
    # (full_reply.strip() == ""). If model A emitted any tokens — even a single
    # char — we accept it and do not retry, because those tokens were already
    # streamed to the client and retrying would duplicate/confuse. If ALL
    # models return empty we return "" and ws_chat handles the both-empty case
    # in T3.
    models = settings.get_models()
    for model_idx, model in enumerate(models):
        sentence_buf = ""
        full_reply = ""

        payload = {
            "model": model,
            "messages": base_messages,
            "stream": True,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await key_manager.send_stream(client, url, payload)
            if resp.status_code != 200:
                # Non-200 (e.g. all keys 429/403): log + surface error, do NOT
                # fall back to another model — this is a key/quota concern, not
                # an empty-content concern.
                error_msg = f"LLM service error: {resp.status_code}"
                try:
                    error_detail = resp.text[:200]
                    error_msg += f" - {error_detail}"
                except Exception:
                    pass
                logger.error(error_msg)
                await ws.send_json({"type": "error", "content": "Сервис временно недоступен. Попробуйте позже."})
                return ""

            async for line in resp.aiter_lines():
                if not line.startswith("data: ") or line == "data: [DONE]":
                    continue
                chunk = json.loads(line[6:])
                if not chunk.get("choices"):
                    continue
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

        # Flush any trailing partial sentence for this model's attempt.
        if sentence_buf.strip():
            tts_tasks.append(
                asyncio.create_task(_tts_and_send(ws, sentence_buf.strip()))
            )

        if full_reply.strip():
            return full_reply

        # Empty content from this model — retry with the next, if any.
        if model_idx + 1 < len(models):
            logger.warning(
                "Model %s returned empty content, falling back to %s",
                model,
                models[model_idx + 1],
            )
            continue

    # All models returned empty — caller (ws_chat) handles the both-empty case
    # in T3. For T2 we return "" and let ws_chat proceed.
    logger.warning("All models returned empty content: %s", models)
    return ""


@app.websocket("/ws/chat")
async def ws_chat(websocket: WebSocket):
    await websocket.accept()
    ctx = ContextWindow(max_turns=settings.max_turns)
    branch_id = "7"
    task_context = ""
    task_id = ""
    tts_tasks: list[asyncio.Task] = []
    session_expired = False

    try:
        init = await websocket.receive_text()
        data = json.loads(init)
        branch_id = data.get("branch_id", "7")
        task_context = data.get("task_context", "")
        # TODO(frontend): the WS init should also send `task_id` so the backend
        # can lock the LLM into the correct role prompt (harry_potter_interview /
        # peer_conversation / about_yourself). TaskRenderer.tsx renders
        # <VoiceChatTask/> for a specific task and has access to task.id; pipe it
        # down to useWebSocket.ts and add it to the init JSON. Until then,
        # task_id stays empty and the backend gracefully falls back to grade_N.
        task_id = data.get("task_id", "")
        logger.info(
            "WS connected: branch=%s, task_id=%s, context=%s",
            branch_id,
            task_id or "none",
            task_context[:50] if task_context else "none",
        )
    except Exception:
        pass

    # Check if API keys are configured
    if not settings.api_keys or not any(k.strip() for k in settings.api_keys):
        logger.error("No LLM API keys configured")
        await websocket.send_json({"type": "error", "content": "Сервис не настроен. Обратитесь к администратору."})
        await websocket.close()
        return

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
                websocket, ctx.messages, branch_id, tts_tasks,
                system_prompt=resolve_prompt(branch_id, task_id) + (f"\n\nContext: {task_context}" if task_context else ""),
            )

            if not full_reply.strip():
                # All models returned empty content (T2 exhausted fallbacks).
                # Don't send an empty 'done' (would look like a hang). Send a
                # clear error so the frontend can show a retry option.
                logger.warning("Empty LLM reply after all model fallbacks (branch=%s)", branch_id)
                await websocket.send_json({
                    "type": "error",
                    "content": "Не получилось сгенерировать ответ. Попробуй сказать ещё раз."
                })
                # Do NOT add empty assistant turn to context. Skip done/tts for
                # this turn — the user can retry on the next message.
                continue  # back to the while not session_expired loop

            if tts_tasks:
                await asyncio.gather(*tts_tasks, return_exceptions=True)
                tts_tasks.clear()

            ctx.add_assistant(full_reply)
            await websocket.send_json({"type": "done"})

        logger.info("Final feedback: branch=%s", branch_id)
        final_prompt = resolve_prompt("final_feedback")
        if task_context:
            final_prompt += f"\n\nTask context: {task_context}"
        ctx.add_user("[SESSION_END] Please say goodbye and give feedback.")

        full_reply = await _stream_response(
            websocket, ctx.messages, branch_id, tts_tasks,
            system_prompt=final_prompt,
        )

        if tts_tasks:
            await asyncio.gather(*tts_tasks, return_exceptions=True)
            tts_tasks.clear()

        # Final feedback: the session is ending regardless, so still send
        # session_ended. But DON'T pollute context with an empty assistant turn
        # if final feedback came back empty (rare, but possible).
        if full_reply.strip():
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
