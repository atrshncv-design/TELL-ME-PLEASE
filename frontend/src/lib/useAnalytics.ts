"use client"
import { useEffect, useRef, useState } from "react"

const SESSION_KEY = "tmp_device_session"

// API-роут /api/event живёт на том же origin, что и фронт (Next.js App Router,
// решения 1/13 из docs/SPEC-spacezai-live-mvp.md), поэтому ходим по
// относительному пути — никаких базовых URL и CORS.

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
    // Fire-and-forget: аналитика не должна блокировать UX. Ошибки сети
    // игнорируем молча (событие не критично для пользователя).
    try {
      fetch("/api/event", {
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
