"""State Machine: map branch_id (grade) and optional task_id to hardcoded system prompt."""

from __future__ import annotations

import json
from pathlib import Path

_DATA = json.loads(
    (Path(__file__).resolve().parent.parent / "prompts_config.json").read_text()
)
_FALLBACK = "grade_7"

# Map task ids coming from the frontend to role-locked prompt keys.
# This is hardcoded prompting (CLAUDE.md:12) — no dynamic prompt generation.
_TASK_ROLE_MAP = {
    "story_harry_potter_interview": "harry_potter_interview",
    "speaking_peer_conversation": "peer_conversation",
    "speaking_about_yourself": "about_yourself",
}


def resolve_prompt(branch_id: str, task_id: str = "") -> str:
    """Resolve a system prompt.

    Resolution order:
      1. If task_id is given, prefer a role-locked prompt:
         a. exact task_id key in prompts_config.json (e.g. "harry_potter_interview")
         b. mapped role key via _TASK_ROLE_MAP (e.g. "story_harry_potter_interview" -> "harry_potter_interview")
      2. Otherwise fall back to the grade-level prompt (grade_N), then grade_7.
    """
    if task_id:
        # try exact task_id key first (e.g. "harry_potter_interview")
        if task_id in _DATA:
            return _DATA[task_id]
        # try mapping known task ids to role keys
        role_key = _TASK_ROLE_MAP.get(task_id)
        if role_key and role_key in _DATA:
            return _DATA[role_key]
    key = f"grade_{branch_id}" if branch_id.isdigit() else branch_id
    return _DATA.get(key, _DATA[_FALLBACK])
