"""FastAPI app with WebSocket chat endpoint and sentence buffer."""

from __future__ import annotations

import asyncio
import json
import logging

import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from app.services.context_window import ContextWindow
from app.services.key_rotation import KeyRotationManager
from app.services.prompt_router import resolve_prompt

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Tell Me Please API")

LLM_URL = "https://opencode.ai/zen/v1/chat/completions"
LLM_MODEL = "deepseek-v4-flash-free"
MAX_TURNS = 12
SENTENCE_ENDERS = set(".!?")


@app.get("/")
def read_root():
    return {"message": "Tell Me Please API is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


key_manager = KeyRotationManager()


@app.websocket("/ws/chat")
async def ws_chat(websocket: WebSocket):
    await websocket.accept()
    ctx = ContextWindow(max_turns=MAX_TURNS)
    branch_id = "7"

    try:
        init = await websocket.receive_text()
        data = json.loads(init)
        branch_id = data.get("branch_id", "7")
        logger.info("WS connected: branch=%s", branch_id)
    except Exception:
        pass

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            user_text = data.get("text", "").strip()
            if not user_text:
                continue

            ctx.add_user(user_text)
            system_prompt = resolve_prompt(branch_id)
            payload = {
                "model": LLM_MODEL,
                "messages": [{"role": "system", "content": system_prompt}]
                + ctx.messages,
                "stream": True,
            }

            sentence_buf = ""
            full_reply = ""

            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await key_manager.send(client, LLM_URL, payload)
                async for line in resp.aiter_lines():
                    if not line.startswith("data: ") or line == "data: [DONE]":
                        continue
                    chunk = json.loads(line[6:])
                    delta = chunk["choices"][0].get("delta", {})
                    token = delta.get("content", "")
                    if not token:
                        continue

                    await websocket.send_json({"type": "token", "content": token})
                    sentence_buf += token
                    full_reply += token

                    if sentence_buf and sentence_buf[-1] in SENTENCE_ENDERS:
                        await websocket.send_json({
                            "type": "sentence",
                            "content": sentence_buf.strip(),
                        })
                        sentence_buf = ""

            if sentence_buf.strip():
                await websocket.send_json({
                    "type": "sentence",
                    "content": sentence_buf.strip(),
                })

            ctx.add_assistant(full_reply)
            await websocket.send_json({"type": "done"})

    except WebSocketDisconnect:
        logger.info("WS disconnected: branch=%s", branch_id)
