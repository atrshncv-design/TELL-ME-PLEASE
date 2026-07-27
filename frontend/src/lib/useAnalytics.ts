"use client"
import { useEffect, useRef, useState } from "react"

const SESSION_KEY = "tmp_device_session"

// The backend runs on :8000. In dev the frontend (:3000) must call
// http://localhost:8000/api/event (cross-origin — CORS allows :3000). We derive
// the backend base from NEXT_PUBLIC_WS_URL, which is already required for the
// chat socket and follows the form ws://localhost:8000/ws/chat.
// TODO(prod): replace this derivation with a dedicated NEXT_PUBLIC_API_BASE env.
function apiBase(): string {
  if (typeof window === "undefined") return ""
  const ws = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/chat"
  // ws://localhost:8000/ws/chat -> http://localhost:8000  (also covers wss:// -> https://)
  return ws.replace(/^ws/, "http").replace(/\/ws\/chat.*$/, "")
}

// crypto.randomUUID() requires a secure context (HTTPS or localhost) — fine for
// dev (localhost) and prod (Vercel/space-z.ai HTTPS). Add a Math.random-based
// fallback for older browsers so the hook never silently no-ops.
function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  // RFC4122-ish v4: 32 hex chars + 4 dashes. Entropy is weaker than
  // crypto.randomUUID but still well within the 8-64 char backend limit.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return ""
  let id = window.localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = uuid()
    window.localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

export interface TrackParams {
  event_type: string
  grade?: number
  task_id?: string
  section_id?: string
  score?: number
  extra?: Record<string, unknown>
}

export function useAnalytics() {
  const sessionIdRef = useRef<string>("")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId()
    setReady(true)
  }, [])

  const track = (params: TrackParams) => {
    if (!sessionIdRef.current) return
    const body = {
      device_session_id: sessionIdRef.current,
      event_type: params.event_type,
      grade: params.grade,
      task_id: params.task_id,
      section_id: params.section_id,
      score: params.score,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      extra: params.extra,
    }
    // Fire-and-forget. Never block UX. Swallow all errors.
    try {
      fetch(`${apiBase()}/api/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true, // survives page unload (e.g. grade_selected -> router.push)
      }).catch(() => {})
    } catch {
      /* ignore */
    }
  }

  return { track, ready }
}
