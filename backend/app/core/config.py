"""Application configuration loaded from environment."""

import os
from dataclasses import dataclass, field


@dataclass
class Settings:
    llm_api_base: str = "https://opencode.ai/zen/v1"
    llm_model: str = "deepseek-v4-flash-free"
    api_keys: list[str] = field(default_factory=lambda: [
        k.strip() for k in os.getenv("LLM_API_KEYS", "").split(",") if k.strip()
    ])
    tts_url: str = os.getenv("TTS_URL", "http://localhost:8880/v1/audio/speech")
    tts_voice: str = "af_bella"
    max_context_turns: int = 12
    session_timeout_seconds: int = 180


settings = Settings()
