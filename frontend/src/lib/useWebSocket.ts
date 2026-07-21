"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type WsMessage =
  | { type: "token"; content: string }
  | { type: "sentence"; content: string }
  | { type: "audio"; content: string }
  | { type: "done" }
  | { type: "session_ended" }
  | { type: "error"; content: string }

interface UseWebSocketOptions {
  branchId: string
  onMessage: (msg: WsMessage) => void
  taskContext?: string
}

export function useWebSocket({ branchId, onMessage, taskContext }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage
  const taskContextRef = useRef(taskContext)
  taskContextRef.current = taskContext

  useEffect(() => {
    const proto = location.protocol === "https:" ? "wss" : "ws"
    const ws = new WebSocket(`${proto}://${location.host}/ws/chat`)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      const init: Record<string, string> = { branch_id: branchId }
      if (taskContextRef.current) {
        init.task_context = taskContextRef.current
      }
      ws.send(JSON.stringify(init))
    }

    ws.onmessage = (e) => {
      try {
        onMessageRef.current(JSON.parse(e.data))
      } catch {}
    }

    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [branchId])

  const send = useCallback((text: string) => {
    wsRef.current?.send(JSON.stringify({ text }))
  }, [])

  return { connected, send }
}
