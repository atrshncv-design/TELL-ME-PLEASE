"""Async TTS client for Kokoro-FastAPI (OpenAI-compatible endpoint)."""

from __future__ import annotations

import base64
import logging

import httpx

logger = logging.getLogger(__name__)

TTS_URL = "http://localhost:8880/v1/audio/speech"
TTS_VOICE = "af_bella"


async def synthesize(text: str) -> str | None:
    """Send text to Kokoro, return base64-encoded mp3 or None on failure."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                TTS_URL,
                json={
                    "model": "kokoro",
                    "input": text,
                    "voice": TTS_VOICE,
                    "response_format": "mp3",
                },
            )
            if resp.status_code == 200:
                return base64.b64encode(resp.content).decode()
            logger.warning("TTS %d: %s", resp.status_code, resp.text[:200])
    except Exception:
        logger.exception("TTS request failed")
    return None
