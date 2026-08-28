/**
 * Стриминг LLM-ответа: async-генератор SSE-событий.
 * Перенос 1:1 из backend/app/main.py::_stream_response + ветки final_feedback.
 *
 * Контракт событий фазы 1 (audio/TTS — тикет T02, здесь не участвует):
 *   token / done / error / session_ended
 */
import { KeyRotationManager, type ChatCompletionPayload, type ChatMessage } from "./keys"
import { resolvePrompt } from "./prompts"

export type ChatEvent =
  | { type: "token"; content: string }
  | { type: "done"; content: string }
  | { type: "error"; content: string }
  | { type: "session_ended"; content: string }

export interface StreamChatParams {
  branchId: string
  taskId?: string
  taskContext?: string
  messages: Array<{ role: "user" | "assistant"; content: string }>
  final?: boolean
}

// --- Конфигурация из env (дефолты 1:1 из backend/app/core/config.py) ---
const LLM_API_BASE = process.env.LLM_API_BASE || "https://opencode.ai/zen/v1"
const LLM_MODEL = process.env.LLM_MODEL || "ling-3.0-flash-free" // primary (backward compat)
const LLM_MODELS = (process.env.LLM_MODELS || "")
  .split(",")
  .map((m) => m.trim())
  .filter((m) => m.length > 0)

/** Таймаут на LLM-запрос (сек), как httpx.AsyncClient(timeout=60.0). */
export const LLM_TIMEOUT_MS = 60_000
/** Максимум ходов диалога, как settings.max_turns (ContextWindow). */
const MAX_TURNS = 12

// In-memory ротация ключей (как key_manager = KeyRotationManager(settings.api_keys) в main.py)
export const keyManager = new KeyRotationManager(
  (process.env.LLM_API_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0),
)

/** Упорядоченный список моделей (primary first) — как settings.get_models(). */
function getModels(): string[] {
  return LLM_MODELS.length > 0 ? LLM_MODELS : [LLM_MODEL]
}

interface StreamChunk {
  choices?: Array<{ delta?: { content?: string } }>
}

/**
 * Сгенерировать ответ: стриминг токенов → done (или error).
 * Для final=true после done дополнительно шлём session_ended с фидбеком.
 */
export async function* streamChatCompletion(
  params: StreamChatParams,
): AsyncGenerator<ChatEvent, void, void> {
  const { branchId, taskId, taskContext, messages, final } = params

  // Промпт: final → final_feedback (+ "Task context: ..."), иначе
  // resolve_prompt(branch_id, task_id) + ("\n\nContext: " + task_context)
  let systemPrompt: string
  if (final) {
    systemPrompt = resolvePrompt("final_feedback")
    if (taskContext) {
      systemPrompt += `\n\nTask context: ${taskContext}`
    }
  } else {
    systemPrompt = resolvePrompt(branchId, taskId)
    if (taskContext) {
      systemPrompt += `\n\nContext: ${taskContext}`
    }
  }

  // Скользящее окно (как ContextWindow в backend): последние MAX_TURNS*2 сообщений
  const llmMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages.slice(-MAX_TURNS * 2).map((m) => ({ role: m.role, content: m.content })),
  ]

  // Финальный фидбек: добавляем маркер конца сессии (как ctx.add_user("[SESSION_END] ..."))
  if (final) {
    const marker = "[SESSION_END] Please say goodbye and give feedback."
    const last = llmMessages[llmMessages.length - 1]
    if (!(last?.role === "user" && last.content.includes("[SESSION_END]"))) {
      llmMessages.push({ role: "user", content: marker })
    }
  }

  const payload: ChatCompletionPayload = { model: "", messages: llmMessages, stream: true }
  const models = getModels()

  // MODEL-level fallback: free-модели нестабильны, ~50% вызовов возвращают
  // ПУСТОЙ content. Пробуем каждую модель по порядку; пустой ответ -> следующая.
  // Это ОТДЕЛЬНО от ротации ключей (429/403 внутри keyManager.sendStream).
  for (let i = 0; i < models.length; i++) {
    const model = models[i]
    payload.model = model
    let fullReply = ""

    let attempt: Awaited<ReturnType<KeyRotationManager["sendStream"]>>
    try {
      attempt = await keyManager.sendStream(`${LLM_API_BASE}/chat/completions`, payload, LLM_TIMEOUT_MS)
    } catch (err) {
      console.error(`[chat/stream] LLM fetch error (${model}):`, err)
      if (i + 1 < models.length) {
        console.warn(`Fetch failed for ${model}, falling back to ${models[i + 1]}`)
        continue
      }
      yield { type: "error", content: "Сервис временно недоступен. Попробуйте позже." }
      return
    }

    if (attempt.response.status !== 200) {
      let detail = ""
      try {
        detail = (await attempt.response.text()).slice(0, 200)
      } catch {
        // тело недоступно — не критично
      }
      console.error(`LLM service error (${model}): ${attempt.response.status} - ${detail}`)
      attempt.cancelTimeout()
      if (i + 1 < models.length) {
        console.warn(`Model ${model} error ${attempt.response.status}, falling back to ${models[i + 1]}`)
        continue
      }
      yield { type: "error", content: "Сервис временно недоступен. Попробуйте позже." }
      return
    }

    // Стриминг: читаем поток, парсим "data: ..." строки, шлём token-события
    try {
      const reader = attempt.response.body?.getReader()
      if (reader) {
        const decoder = new TextDecoder()
        let buffer = ""
        let finished = false

        while (!finished) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith("data:")) continue
            const data = trimmed.slice("data:".length).trim()
            if (data === "[DONE]") {
              finished = true
              break
            }
            try {
              const chunk = JSON.parse(data) as StreamChunk
              const token = chunk.choices?.[0]?.delta?.content ?? ""
              if (token) {
                yield { type: "token", content: token }
                fullReply += token
              }
            } catch {
              // битая строка — пропускаем (как continue в backend)
            }
          }
        }

        // Хвост буфера без финального перевода строки (data: ... в конце потока)
        if (buffer.trim() && !finished) {
          const trimmed = buffer.trim()
          if (trimmed.startsWith("data:")) {
            const data = trimmed.slice("data:".length).trim()
            if (data !== "[DONE]") {
              try {
                const chunk = JSON.parse(data) as StreamChunk
                const token = chunk.choices?.[0]?.delta?.content ?? ""
                if (token) {
                  yield { type: "token", content: token }
                  fullReply += token
                }
              } catch {
                // пропускаем
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(`[chat/stream] stream error (${model}):`, err)
      attempt.cancelTimeout()
      if (i + 1 < models.length) {
        console.warn(`Stream failed for ${model}, falling back to ${models[i + 1]}`)
        continue
      }
      yield { type: "error", content: "Сервис временно недоступен. Попробуйте позже." }
      return
    }
    attempt.cancelTimeout()

    // Ответ непустой — принимаем (даже один символ), стримим done
    if (fullReply.trim()) {
      yield { type: "done", content: fullReply }
      if (final) {
        yield { type: "session_ended", content: fullReply }
      }
      return
    }

    // Пустой ответ этой модели — пробуем следующую, если есть
    if (i + 1 < models.length) {
      console.warn(`Model ${model} returned empty content, falling back to ${models[i + 1]}`)
      continue
    }
  }

  // Все модели вернули пустой ответ — error БЕЗ done (1:1 из ws_chat в main.py)
  console.warn("All models returned empty content:", models)
  yield { type: "error", content: "Не получилось сгенерировать ответ. Попробуй сказать ещё раз." }
}
