"""Central configuration loaded from environment."""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    llm_api_base: str = os.getenv("LLM_API_BASE", "https://opencode.ai/zen/v1")
    llm_model: str = os.getenv("LLM_MODEL", "ling-3.0-flash-free")
    api_keys: list[str] = [
        k.strip()
        for k in os.getenv("LLM_API_KEYS", "").split(",")
        if k.strip()
    ]
    tts_url: str = os.getenv("TTS_URL", "http://localhost:8880/v1/audio/speech")
    tts_voice: str = os.getenv("TTS_VOICE", "af_bella")
    max_turns: int = 12
    session_timeout: int = 180
    # HTTP Basic Auth password for /admin/* (decision Q13). Lives ONLY in the
    # local gitignored .env — never in code, never in the DB. Empty = admin
    # disabled (the require_admin dependency returns 503).
    admin_password: str = os.getenv("ADMIN_PASSWORD", "")


settings = Settings()
