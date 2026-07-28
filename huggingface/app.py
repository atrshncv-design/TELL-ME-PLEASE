"""Entry point for Hugging Face Spaces deployment.

HF Spaces requires the app to listen on port 7860. This file starts uvicorn
with the FastAPI app (which includes /ws/chat, /api/event, /admin/status,
/health). Kokoro TTS runs in-process (kokoro-onnx) — no separate container.
"""
import uvicorn

if __name__ == "__main__":
    # HF Spaces binds externally on 7860. Listen on 0.0.0.0 so HF's proxy
    # can reach us. Single worker to keep memory under the 16GB free tier.
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=7860,
        workers=1,
        log_level="info",
    )
