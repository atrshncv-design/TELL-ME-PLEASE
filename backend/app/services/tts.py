"""Async TTS client for Kokoro-FastAPI (OpenAI-compatible endpoint)."""

from __future__ import annotations

import base64
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def synthesize_speech(text: str) -> str | None:
    """Send text to Kokoro and return base64-encoded audio, or None on failure."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                settings.tts_url,
                json={
                    "model": "kokoro",
                    "input": text,
                    "voice": settings.tts_voice,
                    "response_format": "mp3",
                },
            )
            if resp.status_code == 200:
                return base64.b64encode(resp.content).decode()
            logger.warning("TTS returned %d: %s", resp.status_code, resp.text[:200])
    except Exception:
        logger.exception("TTS request failed")
    return None
