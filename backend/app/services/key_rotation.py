"""Cyclic API key rotation on 429/403 errors.

Rotates through all available keys before giving up. Each key gets
one attempt — if it fails with 429/403, the manager moves to the next.
"""

from __future__ import annotations

import httpx


class KeyRotationManager:
    def __init__(self, keys: list[str]) -> None:
        self._keys = [k for k in keys if k.strip()]
        self._index = 0

    @property
    def current_key(self) -> str:
        if not self._keys:
            raise RuntimeError("No API keys configured in LLM_API_KEYS")
        return self._keys[self._index]

    def rotate(self) -> str:
        """Advance to the next key and return it."""
        self._index = (self._index + 1) % len(self._keys)
        return self.current_key

    async def send(
        self,
        client: httpx.AsyncClient,
        url: str,
        payload: dict,
    ) -> httpx.Response:
        """Try every key once. Returns the first successful response."""
        if not self._keys:
            raise RuntimeError("No API keys configured in LLM_API_KEYS")
        last_resp = None
        for _ in range(len(self._keys)):
            resp = await client.post(
                url,
                headers={"Authorization": f"Bearer {self.current_key}"},
                json=payload,
            )
            if resp.status_code not in (429, 403):
                return resp
            last_resp = resp
            self.rotate()
        return last_resp  # type: ignore[return-value]
