/**
 * POST /api/event — приём анонимных событий воронки.
 *
 * Перенос из backend/app/main.py (FastAPI POST /api/event) на space.z-ai,
 * где нет Python/Docker, но есть fs (решение 13 из docs/SPEC-spacezai-live-mvp.md).
 * Хранилище — JSONL-файл data/events.jsonl вместо SQLite.
 *
 * События анонимны: ключ — device_session_id (UUID в localStorage браузера),
 * не привязанный к логину. Все поля кроме device_session_id и event_type —
 * опциональный контекст для будущей админ-панели (T05).
 *
 * Контракт (1:1 со старым FastAPI):
 *   200 {"status":"ok"}
 *   400 {"detail":"Unknown event_type: <X>"} — неизвестный тип события
 *   400 {"detail":"<понятное сообщение>"}    — битые/отсутствующие поля
 *   500 {"status":"error","detail":"..."}    — ошибка записи/сервера
 */
import { appendFile, mkdir } from "node:fs/promises"
import * as path from "node:path"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Белый список типов событий воронки (перенесён 1:1 из
// backend/app/services/analytics.py). Неизвестные типы отклоняются HTTP 400
// до записи — как в старом API.
const ALLOWED_EVENT_TYPES = new Set([
  "grade_selected",
  "section_selected",
  "task_started",
  "task_completed",
  "task_abandoned",
  "voice_session_started",
  "voice_session_ended",
])

// Путь к JSONL-хранилищу: переопределяется через EVENTS_FILE (для тестов),
// по умолчанию — data/events.jsonl в корне проекта (cwd).
const EVENTS_FILE =
  process.env.EVENTS_FILE || path.join(process.cwd(), "data", "events.jsonl")

// --- Очередь записи (конкурентная безопасность) -----------------------------
// fs.appendFile сам по себе атомарен для строк, но сериализуем записи через
// promise-цепочку: строки не перемешиваются, mkdir выполняется один раз,
// а упавшая запись не ломает цепочку для следующих событий.
let writeQueue: Promise<void> = Promise.resolve()
let dirReady = false

function appendEvent(line: string): Promise<void> {
  const next = writeQueue
    .catch(() => {
      // Предыдущая запись упала — не блокируем последующие события.
    })
    .then(async () => {
      if (!dirReady) {
        await mkdir(path.dirname(EVENTS_FILE), { recursive: true })
        dirReady = true
      }
      await appendFile(EVENTS_FILE, line + "\n", "utf8")
    })
  writeQueue = next
  return next
}

// --- Валидация тела запроса --------------------------------------------------

interface EventInput {
  device_session_id: string
  event_type: string
  grade?: number
  task_id?: string
  section_id?: string
  score?: number
  user_agent?: string
  extra?: Record<string, unknown>
}

type ParseResult = { ok: true; value: EventInput } | { ok: false; error: string }

/** Проверка, что значение — «обычный» JSON-объект (не null, не массив). */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function parseEventBody(raw: unknown): ParseResult {
  if (!isPlainObject(raw)) {
    return { ok: false, error: "Тело запроса должно быть JSON-объектом" }
  }
  const body = raw as Record<string, unknown>

  const deviceSessionId = body.device_session_id
  if (
    typeof deviceSessionId !== "string" ||
    deviceSessionId.length < 8 ||
    deviceSessionId.length > 64
  ) {
    return {
      ok: false,
      error: "device_session_id — строка от 8 до 64 символов",
    }
  }

  const eventType = body.event_type
  if (typeof eventType !== "string") {
    return { ok: false, error: "event_type обязателен" }
  }
  // Точное сообщение старого API (HTTPException detail).
  if (!ALLOWED_EVENT_TYPES.has(eventType)) {
    return { ok: false, error: `Unknown event_type: ${eventType}` }
  }

  // Опциональные поля: проверяем типы, если присутствуют (как pydantic-поля
  // старого EventIn — битый тип отклоняем, а не молча выкидываем).
  const grade = body.grade
  if (grade !== undefined && (typeof grade !== "number" || !Number.isInteger(grade))) {
    return { ok: false, error: "grade должен быть целым числом" }
  }

  const score = body.score
  if (score !== undefined && (typeof score !== "number" || !Number.isInteger(score))) {
    return { ok: false, error: "score должен быть целым числом" }
  }

  for (const field of ["task_id", "section_id", "user_agent"] as const) {
    const value = body[field]
    if (value !== undefined && typeof value !== "string") {
      return { ok: false, error: `${field} должен быть строкой` }
    }
  }

  const extra = body.extra
  if (extra !== undefined && !isPlainObject(extra)) {
    return { ok: false, error: "extra должен быть объектом" }
  }

  return {
    ok: true,
    value: {
      device_session_id: deviceSessionId,
      event_type: eventType,
      grade: grade as number | undefined,
      score: score as number | undefined,
      task_id: body.task_id as string | undefined,
      section_id: body.section_id as string | undefined,
      user_agent: body.user_agent as string | undefined,
      extra: extra as Record<string, unknown> | undefined,
    },
  }
}

/** Строка JSONL: только присутствующие поля + ts (ISO-8601 UTC). */
function buildRecord(value: EventInput): Record<string, unknown> {
  const record: Record<string, unknown> = {
    ts: new Date().toISOString(),
    device_session_id: value.device_session_id,
    event_type: value.event_type,
  }
  if (value.grade !== undefined) record.grade = value.grade
  if (value.task_id !== undefined) record.task_id = value.task_id
  if (value.section_id !== undefined) record.section_id = value.section_id
  if (value.score !== undefined) record.score = value.score
  if (value.user_agent !== undefined) record.user_agent = value.user_agent
  if (value.extra !== undefined) record.extra = value.extra
  return record
}

export async function POST(request: Request): Promise<Response> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return Response.json({ detail: "Некорректный JSON" }, { status: 400 })
  }

  const parsed = parseEventBody(raw)
  if (!parsed.ok) {
    return Response.json({ detail: parsed.error }, { status: 400 })
  }

  try {
    await appendEvent(JSON.stringify(buildRecord(parsed.value)))
  } catch (err) {
    console.error("[api/event] failed to write event:", err)
    return Response.json(
      { status: "error", detail: "Не удалось сохранить событие" },
      { status: 500 },
    )
  }

  return Response.json({ status: "ok" })
}
