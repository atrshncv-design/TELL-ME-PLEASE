/**
 * In-memory FIFO-очередь для LLM-запросов (защита от rate-limit free-ключей).
 * Модуль-синглтон на globalThis — в dev-режиме Next.js HMR не должен
 * обнулять очередь при каждом hot-reload.
 */

export interface AcquireResult {
  /** Освободить слот. Вызывать строго один раз (в finally). */
  release: () => void
  /** true — запрос ждал в очереди (слот был занят). */
  queued: boolean
  /** Позиция в очереди при постановке (0 — сразу получили слот). */
  position: number
}

export class QueueTimeoutError extends Error {
  readonly position: number

  constructor(position: number) {
    super("Сервис перегружен. Попробуйте через минуту.")
    this.name = "QueueTimeoutError"
    this.position = position
  }
}

interface QueueEntry {
  resolve: (result: AcquireResult) => void
  reject: (err: Error) => void
  timer: ReturnType<typeof setTimeout>
  position: number
}

class FifoQueue {
  private running = 0
  private readonly maxConcurrent: number
  private readonly timeoutMs: number
  private readonly waiting: QueueEntry[] = []

  constructor(maxConcurrent: number, timeoutMs: number) {
    this.maxConcurrent = maxConcurrent
    this.timeoutMs = timeoutMs
  }

  /**
   * Захватить слот.
   * - Слот свободен → сразу { queued: false, position: 0 }.
   * - Слот занят → ждём в FIFO; при освобождении → { queued: true, position: N }.
   * - Таймаут ожидания → QueueTimeoutError.
   */
  acquire(): Promise<AcquireResult> {
    if (this.running < this.maxConcurrent) {
      this.running++
      return Promise.resolve({
        release: () => this.release(),
        queued: false,
        position: 0,
      })
    }

    return new Promise<AcquireResult>((resolve, reject) => {
      const position = this.waiting.length + 1
      const entry: QueueEntry = {
        resolve,
        reject,
        timer: setTimeout(() => {
          // Удаляем из очереди и отклоняем
          const idx = this.waiting.indexOf(entry)
          if (idx !== -1) {
            this.waiting.splice(idx, 1)
          }
          reject(new QueueTimeoutError(position))
        }, this.timeoutMs),
        position,
      }
      this.waiting.push(entry)
    })
  }

  /** Освободить слот: будим первого в очереди или уменьшаем счётчик. */
  private release(): void {
    const next = this.waiting.shift()
    if (next) {
      clearTimeout(next.timer)
      next.resolve({
        release: () => this.release(),
        queued: true,
        position: next.position,
      })
      // running не меняется: слот перешёл к следующему
      return
    }
    this.running = Math.max(0, this.running - 1)
  }
}

// --- Синглтон на globalThis (HMR-safe) ---

const GLOBAL_KEY = "__llm_fifo_queue__"

function getQueue(): FifoQueue {
  const g = globalThis as unknown as Record<string, FifoQueue | undefined>
  if (!g[GLOBAL_KEY]) {
    const max = Number(process.env.LLM_QUEUE_MAX || "8")
    const timeout = Number(process.env.LLM_QUEUE_TIMEOUT || "30000")
    g[GLOBAL_KEY] = new FifoQueue(max, timeout)
  }
  return g[GLOBAL_KEY]!
}

/**
 * Захватить слот в очереди LLM-запросов.
 * Вызывающий код ОБЯЗАН вызвать release() в finally.
 */
export function acquire(): Promise<AcquireResult> {
  return getQueue().acquire()
}
