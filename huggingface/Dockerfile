# TELL ME PLEASE — Hugging Face Spaces Docker image
# Single-container: FastAPI + WebSocket + in-process Kokoro TTS on port 7860.

FROM python:3.11-slim

# HF Spaces runs as user "user" (uid 1000) — set up before copying.
RUN useradd -m -u 1000 user
WORKDIR /app
RUN chown user:user /app

# System deps: minimal (kokoro-onnx ships pure-Python/numpy, no ffmpeg needed
# for CPU synthesis to WAV/MP3 bytes). curl for healthchecks.
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python deps. Pin numpy<2 for onnxruntime compatibility on free CPU tier.
COPY requirements-hf.txt /tmp/requirements-hf.txt
RUN pip install --no-cache-dir -r /tmp/requirements-hf.txt

# Copy app code (the FastAPI app + services + prompts_config + content).
# On HF Spaces, you'll copy the `app/` folder from the project's `backend/app/`.
COPY --chown=user:user app ./app
COPY --chown=user:user app.py ./app.py

# Pre-fetch the Kokoro model + voice on first build so cold-start is fast.
# kokoro-onnx downloads to ~/.cache/kokoro on first use; we trigger it here.
RUN python -c "from kokoro_onnx import Kokoro; Kokoro.from_pretrained(speed=1.0)" || \
    echo "(model will download on first request if pre-fetch failed)"

USER user
ENV PYTHONUNBUFFERED=1 \
    PORT=7860 \
    PYTHONPATH=/app

EXPOSE 7860

# Healthcheck: HF uses this to know when the container is ready.
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -fs http://localhost:7860/health || exit 1

CMD ["python", "app.py"]
