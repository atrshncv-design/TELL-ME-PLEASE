"""State Machine: map branch_id to hardcoded system prompt."""

from __future__ import annotations

import json
from pathlib import Path

_DATA = json.loads(
    (Path(__file__).resolve().parent.parent / "prompts_config.json").read_text()
)
_FALLBACK = "grade_7"


def resolve_prompt(branch_id: str) -> str:
    key = f"grade_{branch_id}" if branch_id.isdigit() else branch_id
    return _DATA.get(key, _DATA[_FALLBACK])
