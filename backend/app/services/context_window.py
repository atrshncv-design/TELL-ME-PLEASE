"""Sliding window context manager for LLM conversation history."""

from __future__ import annotations


class ContextWindow:
    """Keeps the last N turns (user + assistant pairs) to stay under token limits."""

    def __init__(self, max_turns: int = 12) -> None:
        self._max_pairs = max_turns
        self._messages: list[dict] = []

    def add_user(self, text: str) -> None:
        self._messages.append({"role": "user", "content": text})
        self._trim()

    def add_assistant(self, text: str) -> None:
        self._messages.append({"role": "assistant", "content": text})
        self._trim()

    @property
    def messages(self) -> list[dict]:
        return list(self._messages)

    def clear(self) -> None:
        self._messages.clear()

    def _trim(self) -> None:
        max_msgs = self._max_pairs * 2
        if len(self._messages) > max_msgs:
            self._messages = self._messages[-max_msgs:]
