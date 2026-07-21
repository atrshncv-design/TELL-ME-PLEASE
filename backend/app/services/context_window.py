"""Sliding window: keep last N turns to stay under token limits."""

from __future__ import annotations


class ContextWindow:
    def __init__(self, max_turns: int = 12) -> None:
        self._max = max_turns
        self._msgs: list[dict] = []

    def add_user(self, text: str) -> None:
        self._msgs.append({"role": "user", "content": text})
        self._trim()

    def add_assistant(self, text: str) -> None:
        self._msgs.append({"role": "assistant", "content": text})
        self._trim()

    @property
    def messages(self) -> list[dict]:
        return list(self._msgs)

    def _trim(self) -> None:
        limit = self._max * 2
        if len(self._msgs) > limit:
            self._msgs = self._msgs[-limit:]
