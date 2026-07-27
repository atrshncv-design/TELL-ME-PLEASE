"""Central configuration loaded from environment."""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    llm_api_base: str = os.getenv("LLM_API_BASE", "https://opencode.ai/zen/v1")
    llm_model: str = os.getenv("LLM_MODEL", "ling-3.0-flash-free")  # primary (backward compat)
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

    def get_models(self) -> list[str]:
        """Ordered list of LLM models to try (primary first). Falls back to [llm_model].

        Benchmarks (T1/bd23c8e) found the free OpenCode Zen models are
        UNSTABLE: ~50% of calls to some return an EMPTY `content`. We keep
        `llm_model` as the primary for backward-compat and read LLM_MODELS
        (comma-separated, primary first) as an ordered fallback list. When the
        env is unset/empty we fall back to just [llm_model]. Model fallback is
        a SEPARATE concern from API-key rotation (key_rotation.py): this list
        cycles MODELS on empty/bad content, not KEYS on 429/403.
        """
        env = os.getenv("LLM_MODELS", "")
        models = [m.strip() for m in env.split(",") if m.strip()]
        return models or [self.llm_model]


settings = Settings()
