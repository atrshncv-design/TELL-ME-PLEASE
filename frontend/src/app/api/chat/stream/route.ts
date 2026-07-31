/**
 * POST /api/chat/stream — SSE-чат с LLM (перенос WS /ws/chat из backend).
 *
 * Сессия СТАТЕЛЕСС на сервере (решение из docs/SPEC-spacezai-live-mvp.md):
 * клиент присылает историю messages в каждом запросе, 3-мин таймер живёт
 * на клиенте (final=true означает, что время истекло и нужен фидбек).
 *
 * Контракт SSE-событий (каждое — строка "data: <json>\n\n"):
 *   {"type":"token","content":"..."}
 *   {"type":"done","content":"<полный ответ>"}
 *   {"type":"error","content":"..."}
 *   {"type":"session_ended","content":"<финальный фидбек>"}   — только при final=true
 *
 * Ошибки ДО начала стрима (валидация) — JSON 400; ошибки сервиса/LLM —
 * SSE-событие error (как error-событие WS-контракта фазы 1).
 */
import { keyManager, streamChatCompletion } from "@/server/chat/stream"

// Платформа space.z-ai — полный Node.js; fetch-стриминг в edge не гарантирован
export const runtime = "nodejs"

const SSE_HEADERS: Record<string, string> = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
}

interface ChatMessageIn {
  role: "user" | "assistant"
  content: string
}

interface ChatRequest {
  branch_id: string
  task_id?: string
  task_context?: string
  messages: ChatMessageIn[]
  final?: boolean
}

type ParseResult = { ok: true; value: ChatRequest } | { ok: false; error: string }

/** Валидация тела запроса (branch_id обязателен, messages — непустой массив). */
function parseChatRequest(raw: unknown): ParseResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Некорректный JSON" }
  }
  const body = raw as Record<string, unknown>

  const branchId = body.branch_id
  if (typeof branchId !== "string" || branchId.trim() === "") {
    return { ok: false, error: "branch_id обязателен" }
  }

  const messages = body.messages
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: "messages — непустой массив сообщений" }
  }
  for (const m of messages) {
    if (typeof m !== "object" || m === null) {
      return { ok: false, error: "Некорректное сообщение в messages" }
    }
    const msg = m as Record<string, unknown>
    if ((msg.role !== "user" && msg.role !== "assistant") || typeof msg.content !== "string") {
      return { ok: false, error: "Некорректное сообщение в messages" }
    }
  }

  return {
    ok: true,
    value: {
      branch_id: branchId,
      task_id: typeof body.task_id === "string" ? body.task_id : undefined,
      task_context: typeof body.task_context === "string" ? body.task_context : undefined,
      messages: messages as ChatMessageIn[],
      final: body.final === true,
    },
  }
}

/** Одно SSE-событие: строка "data: <json>\n\n". */
function sseEvent(event: object): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

export async function POST(request: Request): Promise<Response> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return Response.json({ error: "Некорректный JSON" }, { status: 400 })
  }

  const parsed = parseChatRequest(raw)
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 })
  }
  const { branch_id, task_id, task_context, messages, final } = parsed.value

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: object): void => {
        try {
          controller.enqueue(encoder.encode(sseEvent(event)))
        } catch {
          // клиент отключился — молча завершаем стрим
        }
      }

      try {
        // Нет ключей — error-событие и стоп (как в ws_chat: error + close)
        if (!keyManager.hasKeys) {
          send({ type: "error", content: "Сервис не настроен. Обратитесь к администратору." })
          return
        }

        for await (const event of streamChatCompletion({
          branchId: branch_id,
          taskId: task_id,
          taskContext: task_context,
          messages,
          final,
        })) {
          send(event)
        }
      } catch (err) {
        // Непредвиденная ошибка — шлём error-событие, чтобы клиент не висел
        console.error("[api/chat/stream] unexpected error:", err)
        send({ type: "error", content: "Внутренняя ошибка сервера. Попробуйте ещё раз." })
      } finally {
        try {
          controller.close()
        } catch {
          // поток уже закрыт (клиент отключился)
        }
      }
    },
  })

  return new Response(stream, { headers: SSE_HEADERS })
}
