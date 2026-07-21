"""State Machine: routes branch_id to hardcoded system prompt."""

from __future__ import annotations

import json
from pathlib import Path

_PROMPTS_FILE = Path(__file__).resolve().parent.parent / "prompts_config.json"

with open(_PROMPTS_FILE, encoding="utf-8") as _f:
    _PROMPTS: dict[str, str] = json.load(_f)

_FALLBACK = "grade_7"


def resolve_prompt(branch_id: str) -> str:
    """Return the system prompt for a given branch_id (class number)."""
    key = f"grade_{branch_id}" if branch_id.isdigit() else branch_id
    return _PROMPTS.get(key, _PROMPTS[_FALLBACK])
