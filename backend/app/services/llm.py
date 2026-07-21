"""LLM streaming client for OpenCode Zen."""

from __future__ import annotations

import json as _json

import httpx

from app.core.config import settings
from app.services.key_rotation import KeyRotationManager
from app.services.prompt_router import resolve_prompt


async def stream_llm_response(
    messages: list[dict],
    branch_id: str,
    key_manager: KeyRotationManager,
    system_prompt: str | None = None,
):
    """Yield tokens from LLM streaming response."""
    prompt = system_prompt or resolve_prompt(branch_id)
    system_msg = {"role": "system", "content": prompt}
    payload = {
        "model": settings.llm_model,
        "messages": [system_msg] + messages,
        "stream": True,
    }
    url = f"{settings.llm_api_base}/chat/completions"

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await key_manager.send(client, url, payload)
        async for line in resp.aiter_lines():
            if line.startswith("data: ") and line != "data: [DONE]":
                chunk = _json.loads(line[6:])
                delta = chunk["choices"][0].get("delta", {})
                if content := delta.get("content"):
                    yield content
