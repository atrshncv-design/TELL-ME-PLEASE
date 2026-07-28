"""TTS adapter: HTTP-Kokoro (local dev) or in-process kokoro-onnx (HF Spaces).

Public API is unchanged: ``synthesize(text)`` returns base64-encoded audio
bytes as a string, or None on failure. The backend dispatches based on
``settings.tts_mode``:

- ``"http"``   — POST to a Kokoro-FastAPI container (local dev, docker-compose).
                 Returns base64 mp3 (the container's response body).
- ``"kokoro"`` — run kokoro-onnx IN-PROCESS (HF Spaces allows only ONE
                 container, so Kokoro can't be a sidecar). Returns base64 wav
                 (float32 PCM, 24 kHz). Both mp3 and wav are decoded by the
                 frontend's ``AudioContext.decodeAudioData``.

The in-process ``kokoro_onnx`` import is deferred to first use so http-mode
users don't need the (heavy) dependency installed.
"""

from __future__ import annotations

import base64
import io
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Lazily-initialized in-process Kokoro (only loaded when TTS_MODE=kokoro).
# Module-level so the model stays loaded across requests instead of being
# re-loaded (the .onnx is ~300 MB) on every synthesis call.
_kokoro_instance = None


def _get_kokoro():
    """Lazily construct the in-process kokoro-onnx model.

    Only called when ``TTS_MODE=kokoro``. The ``kokoro_onnx`` import is done
    here (not at module top) so http-mode users never need the dependency.

    Verified API (kokoro-onnx 0.5.0, src/kokoro_onnx/__init__.py): there is
    NO ``from_pretrained`` — the constructor takes the model + voices file
    PATHS, which the library does NOT bundle or auto-download. Paths come from
    settings (env-driven) so HF Spaces can point at its persistent data dir.
    """
    global _kokoro_instance
    if _kokoro_instance is None:
        from kokoro_onnx import Kokoro  # heavy; deferred import
        _kokoro_instance = Kokoro(
            settings.tts_kokoro_model,
            settings.tts_kokoro_voices,
        )
        logger.info(
            "kokoro-onnx model loaded in-process (model=%s voices=%s)",
            settings.tts_kokoro_model,
            settings.tts_kokoro_voices,
        )
    return _kokoro_instance


async def synthesize(text: str) -> str | None:
    """Synthesize speech for ``text``.

    Returns base64-encoded audio as a string (mp3 for http mode, wav for
    kokoro mode — both decode via ``AudioContext.decodeAudioData``), or None
    on failure.
    """
    if settings.tts_mode == "kokoro":
        return await _synthesize_kokoro(text)
    return await _synthesize_http(text)


async def _synthesize_http(text: str) -> str | None:
    """HTTP path — POST to the Kokoro-FastAPI container (local dev)."""
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
            logger.warning("TTS http %d: %s", resp.status_code, resp.text[:200])
    except Exception:
        logger.exception("TTS http request failed")
    return None


async def _synthesize_kokoro(text: str) -> str | None:
    """In-process path — kokoro-onnx. Returns base64 wav (CPU synthesis).

    ``Kokoro.create()`` is synchronous (runs the ONNX session) so we dispatch
    it to a worker thread via ``asyncio.to_thread`` to avoid blocking the
    event loop. It returns ``(samples: NDArray[float32], sample_rate: int)``
    where ``sample_rate`` is the Kokoro constant 24000.
    """
    import asyncio

    try:
        import numpy as np
        import soundfile as sf
    except ImportError:
        logger.exception(
            "TTS kokoro mode requires 'soundfile' (and numpy); "
            "install with: pip install soundfile numpy"
        )
        return None

    try:
        kokoro = _get_kokoro()
        # Verified signature: create(text, voice, speed=1.0, lang="en-us", ...)
        # -> (NDArray[float32], int). Run off the event loop (blocking ONNX call).
        samples, sample_rate = await asyncio.to_thread(
            kokoro.create,
            text,
            voice=settings.tts_voice,
            speed=1.0,
        )
        if not isinstance(samples, np.ndarray):
            samples = np.asarray(samples, dtype=np.float32)
        buf = io.BytesIO()
        sf.write(buf, samples, sample_rate, format="WAV", subtype="FLOAT")
        return base64.b64encode(buf.getvalue()).decode()
    except Exception:
        logger.exception("TTS kokoro (in-process) failed")
        return None
