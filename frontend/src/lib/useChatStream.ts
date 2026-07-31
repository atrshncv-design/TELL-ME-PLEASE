"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * SSE-клиент чата на fetch + ReadableStream (замена useWebSocket, решение 2
 * из docs/SPEC-spacezai-live-mvp.md). Сервер СТАТЕЛЕСС (T01): клиент хранит
 * историю messages и присылает её в каждом POST /api/chat/stream.
 *
 * Контракт SSE-событий (строка "data: <json>\n\n"):
 *   {"type":"token","content":"..."}
 *   {"type":"done","content":"<полный ответ>"}
 *   {"type":"error","content":"..."}
 *   {"type":"session_ended","content":"<финальный фидбек>"}  — только при final=true
 * (событие "queued" появится в T03 — сейчас неизвестные типы игнорируются).
 */

export type ChatStreamMessage =
  | { type: "token"; content: string }
  | { type: "done"; content: string }
  | { type: "error"; content: string }
  | { type: "session_ended"; content: string }

type ChatMsg = { role: "user" | "assistant"; content: string }

interface SessionOptions {
  branchId: string
  taskId?: string
  taskContext?: string
}

// Максимум ходов диалога (как settings.max_turns в backend): 12 ходов = 24
// сообщения. Старые обрезаем при переполнении — сервер тоже держит последние
// MAX_TURNS*2 сообщений, дублировать больше смысла нет.
const MAX_TURNS = 12
const MAX_MESSAGES = MAX_TURNS * 2

// Маркер конца сессии — тот же, что добавляет сервер в ветке final_feedback
// (нужен только когда история пуста, чтобы пройти валидацию messages).
const SESSION_END_MARKER = "[SESSION_END] Please say goodbye and give feedback."

export function useChatStream({
  onMessage,
}: {
  onMessage: (msg: ChatStreamMessage) => void
}) {
  const [connected, setConnected] = useState(false)
  const [sending, setSending] = useState(false)

  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const sessionRef = useRef<SessionOptions | null>(null)
  const lastSessionRef = useRef<SessionOptions | null>(null)
  const historyRef = useRef<ChatMsg[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)
  const finalSentRef = useRef(false)

  // Отменяем запрос при размонтировании
  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  /** Обрезка истории до последних MAX_MESSAGES сообщений. */
  const trimHistory = () => {
    if (historyRef.current.length > MAX_MESSAGES) {
      historyRef.current = historyRef.current.slice(historyRef.current.length - MAX_MESSAGES)
    }
  }

  /** POST /api/chat/stream + разбор SSE-потока. */
  const post = useCallback(async (messages: ChatMsg[], final: boolean) => {
    const session = sessionRef.current
    if (!session) return

    // Новый запрос отменяет предыдущий (старые ответы больше не нужны)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const myId = ++requestIdRef.current
    setSending(true)

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_id: session.branchId,
          task_id: session.taskId || undefined,
          task_context: session.taskContext || undefined,
          messages,
          final,
        }),
        signal: controller.signal,
      })

      // HTTP-ошибка (валидация/500) — пробуем достать текст ошибки из JSON
      if (!res.ok) {
        let detail = `Ошибка сервера (${res.status})`
        try {
          const j = (await res.json()) as { error?: string }
          if (j?.error) detail = j.error
        } catch {
          // тело не JSON — оставляем дефолт
        }
        onMessageRef.current({ type: "error", content: detail })
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        onMessageRef.current({ type: "error", content: "Пустой ответ сервера." })
        return
      }

      const decoder = new TextDecoder()
      let buffer = ""
      let full = ""

      // Одно SSE-событие ("data: <json>"). Неизвестные типы (напр. "queued" из T03)
      // молча пропускаем — клиент остаётся совместимым вперёд.
      const handleEvent = (data: string) => {
        if (data === "[DONE]") return
        let evt: { type?: string; content?: unknown }
        try {
          evt = JSON.parse(data)
        } catch {
          return
        }
        const type = evt.type
        if (
          type !== "token" &&
          type !== "done" &&
          type !== "error" &&
          type !== "session_ended"
        ) {
          return
        }
        const content = typeof evt.content === "string" ? evt.content : ""

        if (type === "token") full += content
        if (type === "done") {
          // Ответ ассистента уходит в историю для следующих запросов
          historyRef.current.push({ role: "assistant", content: content || full })
          trimHistory()
        }
        if (type === "session_ended") setConnected(false)

        onMessageRef.current({ type, content })
      }

      // Разбор накопленного буфера: события разделены пустой строкой (\n\n)
      const processBuffer = () => {
        const parts = buffer.split("\n\n")
        buffer = parts.pop() ?? ""
        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith("data:")) continue
          handleEvent(line.slice("data:".length).trim())
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        processBuffer()
      }
      // Хвост буфера без финального \n\n
      processBuffer()
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      // Сетевая ошибка (сервер недоступен) — «офлайн» + сообщение в чат
      console.error("[useChatStream] network error:", err)
      setConnected(false)
      onMessageRef.current({
        type: "error",
        content: "Нет связи с сервером. Проверь, что сервис запущен.",
      })
    } finally {
      // Только последний запрос может снимать флаг sending
      if (requestIdRef.current === myId) setSending(false)
    }
  }, [])

  /**
   * Начать сессию: устанавливает branch/task и очищает историю.
   * Вызывается при монтировании компонента (аналог WS-init фазы 1).
   */
  const startSession = useCallback((opts: SessionOptions) => {
    lastSessionRef.current = opts
    sessionRef.current = opts
    historyRef.current = []
    finalSentRef.current = false
    setConnected(true)
  }, [])

  /**
   * Отправить реплику пользователя. opts.final = true — финальный запрос по
   * истечении таймера: история уходит как есть, сервер сам соберёт фидбек
   * (ветка final_feedback) и пришлёт session_ended.
   */
  const send = useCallback(
    (text: string, opts?: { final?: boolean }) => {
      if (!sessionRef.current) return

      if (opts?.final) {
        if (finalSentRef.current) return
        finalSentRef.current = true
        if (text.trim()) {
          historyRef.current.push({ role: "user", content: text })
        }
        // Пустая история не проходит валидацию сервера — добавляем маркер
        if (historyRef.current.length === 0) {
          historyRef.current.push({ role: "user", content: SESSION_END_MARKER })
        }
        void post(historyRef.current, true)
        return
      }

      // После финального запроса обычные реплики больше не шлём
      if (finalSentRef.current) return
      const trimmed = text.trim()
      if (!trimmed) return
      historyRef.current.push({ role: "user", content: trimmed })
      trimHistory()
      void post(historyRef.current, false)
    },
    [post],
  )

  /** Финальный запрос по таймеру: история + final:true. */
  const sendFinal = useCallback(() => send("", { final: true }), [send])

  /** Полный сброс: отмена запроса, очистка истории, «офлайн». */
  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    historyRef.current = []
    finalSentRef.current = false
    setConnected(false)
    setSending(false)
  }, [])

  /** Перезапуск сессии с теми же параметрами (кнопка «Переподключиться»). */
  const reconnect = useCallback(() => {
    reset()
    if (lastSessionRef.current) startSession(lastSessionRef.current)
  }, [reset, startSession])

  return { connected, sending, startSession, send, sendFinal, reset, reconnect }
}
