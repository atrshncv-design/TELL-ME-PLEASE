"""Anonymous funnel-event storage on SQLite (parameterized, SQL-injection-safe).

Foundation for the teacher dashboard (decisions Q12/Q13). Events are
ANONYMOUS: keyed by a device-session UUID generated on the frontend and
stored in localStorage, never a login. SQLite is in the stdlib — zero new
dependencies — and runs against a single file at backend/data/analytics.db
(NOT the tz-pg Postgres in Docker; that belongs to another project).

All writes go through parameterized `?` placeholders, so SQL injection is
impossible by construction regardless of what the client sends.
"""

from __future__ import annotations

import logging
import os
import sqlite3
import threading

logger = logging.getLogger(__name__)

# Whitelist of funnel event types. Unknown types are rejected with HTTP 400
# at the route layer before reaching record_event().
ALLOWED_EVENT_TYPES: set[str] = {
    "grade_selected",
    "section_selected",
    "task_started",
    "task_completed",
    "task_abandoned",
    "voice_session_started",
    "voice_session_ended",
}

# backend/data/analytics.db — resolved relative to the app root so it is the
# same file regardless of the process cwd.
_DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
_DB_PATH = os.path.join(_DB_DIR, "analytics.db")

_lock = threading.Lock()
_conn: sqlite3.Connection | None = None


def _get_connection() -> sqlite3.Connection:
    """Open the SQLite connection lazily on first use and ensure the schema."""
    global _conn
    if _conn is None:
        os.makedirs(_DB_DIR, exist_ok=True)
        # check_same_thread=False: FastAPI runs in an async event loop (one
        # thread) but we still guard every write with _lock for safety.
        conn = sqlite3.connect(_DB_PATH, check_same_thread=False)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS events (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              ts TEXT NOT NULL,
              device_session_id TEXT NOT NULL,
              event_type TEXT NOT NULL,
              grade INTEGER,
              task_id TEXT,
              section_id TEXT,
              score INTEGER,
              user_agent TEXT,
              extra TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
            CREATE INDEX IF NOT EXISTS idx_events_device ON events(device_session_id);
            """
        )
        conn.commit()
        _conn = conn
        logger.info("analytics.db initialized at %s", _DB_PATH)
    return _conn


def record_event(
    *,
    ts: str,
    device_session_id: str,
    event_type: str,
    grade: int | None = None,
    task_id: str | None = None,
    section_id: str | None = None,
    score: int | None = None,
    user_agent: str | None = None,
    extra: str | None = None,
) -> None:
    """Insert one funnel event using parameterized placeholders.

    Every value is bound as a `?` parameter — client input is NEVER
    interpolated into the SQL text, so it is stored verbatim and cannot be
    executed as SQL.
    """
    conn = _get_connection()
    with _lock:
        conn.execute(
            """
            INSERT INTO events
              (ts, device_session_id, event_type, grade, task_id,
               section_id, score, user_agent, extra)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                ts,
                device_session_id,
                event_type,
                grade,
                task_id,
                section_id,
                score,
                user_agent,
                extra,
            ),
        )
        conn.commit()
