/**
 * Ротация ключей: на 429/403 пробуем следующий ключ из LLM_API_KEYS.
 * Перенос 1:1 из backend/app/services/key_rotation.py (in-memory, без cron).
 */

export interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

export interface ChatCompletionPayload {
  model: string
  messages: ChatMessage[]
  stream: boolean
}

export interface StreamAttempt {
  response: Response
  /** Отменить таймер таймаута после полного чтения тела ответа. */
  cancelTimeout: () => void
}

export class KeyRotationManager {
  private readonly keys: string[]
  private index = 0

  constructor(apiKeys: readonly string[]) {
    // Пустые ключи отбрасываем (как filter в key_rotation.py)
    this.keys = apiKeys.filter((k) => k.trim().length > 0)
  }

  get hasKeys(): boolean {
    return this.keys.length > 0
  }

  get currentKey(): string {
    if (this.keys.length === 0) {
      throw new Error("No API keys provided")
    }
    return this.keys[this.index]
  }

  rotate(): string {
    if (this.keys.length > 1) {
      this.index = (this.index + 1) % this.keys.length
    }
    return this.currentKey
  }

  /**
   * Попробовать каждый ключ один раз. Вернуть первый успешный ответ
   * (или последний ответ, если все ключи вернули 429/403).
   *
   * Таймер таймаута НЕ гасится после получения заголовков — он живёт до
   * полного чтения тела ответа (caller зовёт cancelTimeout), т.е. 60с
   * покрывают и стриминг, а не только ожидание заголовков.
   * Сетевые ошибки ротацией не лечим (1:1 с backend — httpx-исключение
   * всплывало наверх, а не перебирало ключи).
   */
  async sendStream(url: string, payload: ChatCompletionPayload, timeoutMs: number): Promise<StreamAttempt> {
    if (this.keys.length === 0) {
      throw new Error("No API keys provided")
    }
    let last: Response | null = null
    for (let i = 0; i < this.keys.length; i++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      let resp: Response
      try {
        resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.currentKey}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })
      } catch (err) {
        clearTimeout(timer)
        throw err
      }

      if (resp.status !== 429 && resp.status !== 403) {
        return { response: resp, cancelTimeout: () => clearTimeout(timer) }
      }
      clearTimeout(timer)
      last = resp
      this.rotate()
    }
    // Все ключи вернули 429/403 — вернуть последний ответ (таймер уже погашен)
    return { response: last!, cancelTimeout: () => {} }
  }
}
