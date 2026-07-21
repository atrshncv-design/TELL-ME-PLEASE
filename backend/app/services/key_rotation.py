"""Key rotation: cycle through API keys on 429/403 errors."""

from __future__ import annotations

import httpx


class KeyRotationManager:
    def __init__(self, api_keys: list[str]) -> None:
        self._keys = [k for k in api_keys if k.strip()]
        self._index = 0

    @property
    def current_key(self) -> str:
        if not self._keys:
            raise RuntimeError("No API keys provided")
        return self._keys[self._index]

    def rotate(self) -> str:
        if len(self._keys) > 1:
            self._index = (self._index + 1) % len(self._keys)
        return self.current_key

    async def send(
        self, client: httpx.AsyncClient, url: str, payload: dict
    ) -> httpx.Response:
        """Try each key once. Return first successful response."""
        if not self._keys:
            raise RuntimeError("No API keys provided")
        last = None
        for _ in range(len(self._keys)):
            resp = await client.post(
                url,
                headers={"Authorization": f"Bearer {self.current_key}"},
                json=payload,
            )
            if resp.status_code not in (429, 403):
                return resp
            last = resp
            self.rotate()
        return last
