import { readFile } from "node:fs/promises"
import * as path from "node:path"
import RefreshButton from "./RefreshButton"

/**
 * /admin — скрытая админ-панель с анонимной статистикой (T05, решение 15
 * из docs/SPEC-spacezai-live-mvp.md).
 *
 * Server Component: читает data/events.jsonl напрямую через fs, считает
 * метрики на сервере и отдаёт готовый HTML. force-dynamic — без кэша,
 * каждая загрузка/refresh показывает свежие события.
 *
 * MVP-защита: страница нигде не ссылается в UI, вход только через
 * незаметную кнопку-шестерёнку + пароль на /api/admin/auth. Middleware
 * с cookie сознательно не делаем (решено в T05) — для учительского MVP
 * достаточно скрытости + пароля.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const metadata = {
  title: "Админка — time travel mission",
  robots: { index: false, follow: false },
}

// --- Типы ------------------------------------------------------------------

interface AnalyticsEvent {
  ts: string
  device_session_id: string
  event_type: string
  grade?: number
  task_id?: string
  section_id?: string
  score?: number
  user_agent?: string
  extra?: Record<string, unknown>
}

interface Stats {
  totalEvents: number
  uniqueStudents: number
  byGrade: { grade: number; students: number }[]
  voiceStarters: number
  voiceStartersUnique: number
  averageScore: number | null
  scoredCount: number
  recent: AnalyticsEvent[]
  parseErrors: number
}

// --- Чтение и агрегация ----------------------------------------------------

const EVENTS_FILE =
  process.env.EVENTS_FILE ||
  path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "events.jsonl")

async function loadEvents(): Promise<{ events: AnalyticsEvent[]; parseErrors: number }> {
  let raw: string
  try {
    raw = await readFile(EVENTS_FILE, "utf8")
  } catch {
    // Файла ещё нет (никто ничего не нажимал) — это нормально, не ошибка.
    return { events: [], parseErrors: 0 }
  }
  const events: AnalyticsEvent[] = []
  let parseErrors = 0
  for (const line of raw.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const parsed = JSON.parse(trimmed) as AnalyticsEvent
      // Минимальная sanity-проверка: без id или типа событие бесполезно.
      if (typeof parsed.device_session_id === "string" && typeof parsed.event_type === "string") {
        events.push(parsed)
      } else {
        parseErrors++
      }
    } catch {
      // Битая строка (обрыв записи, ручная правка) — пропускаем, считаем.
      parseErrors++
    }
  }
  return { events, parseErrors }
}

function computeStats(events: AnalyticsEvent[], parseErrors: number): Stats {
  // Уникальные ученики — по тем, кто хоть раз выбрал класс или начал задание
  // (т.е. реально поработал, а не просто открыл страницу).
  const ACTIVE_TYPES = new Set(["grade_selected", "task_started"])
  const students = new Set<string>()
  for (const e of events) {
    if (ACTIVE_TYPES.has(e.event_type)) students.add(e.device_session_id)
  }

  // Распределение по классам: уникальные ученики с событием grade_selected
  // по каждому классу. Один ученик может выбрать несколько классов —
  // тогда он учитывается в каждом (это осмысленно для воронки).
  const gradeMap = new Map<number, Set<string>>()
  for (const e of events) {
    if (e.event_type === "grade_selected" && typeof e.grade === "number") {
      let set = gradeMap.get(e.grade)
      if (!set) {
        set = new Set()
        gradeMap.set(e.grade, set)
      }
      set.add(e.device_session_id)
    }
  }
  const byGrade = [...gradeMap.entries()]
    .map(([grade, set]) => ({ grade, students: set.size }))
    .sort((a, b) => a.grade - b.grade)

  // Дошли до голосового чата: события voice_session_started.
  const voiceEvents = events.filter((e) => e.event_type === "voice_session_started")
  const voiceStartersUnique = new Set(voiceEvents.map((e) => e.device_session_id)).size

  // Средний балл — только по task_completed, где score задан.
  const scored = events.filter(
    (e) => e.event_type === "task_completed" && typeof e.score === "number",
  )
  const averageScore =
    scored.length > 0
      ? Math.round((scored.reduce((s, e) => s + (e.score as number), 0) / scored.length) * 10) / 10
      : null

  // Последние 20 событий — свежие сверху.
  const recent = events.slice(-20).reverse()

  return {
    totalEvents: events.length,
    uniqueStudents: students.size,
    byGrade,
    voiceStarters: voiceEvents.length,
    voiceStartersUnique,
    averageScore,
    scoredCount: scored.length,
    recent,
    parseErrors,
  }
}

// --- Форматирование ---------------------------------------------------------

function formatTs(iso: string): string {
  // Компактный вид: 31.07 14:25:03. Падаем обратно в сырую строку, если дата битая.
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  const ss = String(d.getSeconds()).padStart(2, "0")
  return `${dd}.${mm} ${hh}:${mi}:${ss}`
}

const EVENT_LABELS: Record<string, string> = {
  grade_selected: "Выбор класса",
  section_selected: "Выбор раздела",
  task_started: "Начало задания",
  task_completed: "Задание выполнено",
  task_abandoned: "Задание брошено",
  voice_session_started: "Голосовой чат: старт",
  voice_session_ended: "Голосовой чат: конец",
}

function eventLabel(type: string): string {
  return EVENT_LABELS[type] ?? type
}

// --- Страница ---------------------------------------------------------------

export default async function AdminPage() {
  const { events, parseErrors } = await loadEvents()
  const stats = computeStats(events, parseErrors)

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Админ-панель</h1>
          <p className="text-sm text-slate-500">Анонимная статистика платформы</p>
        </div>
        <RefreshButton />
      </div>

      {stats.totalEvents === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-10 text-center text-slate-500">
          Пока нет данных. События появятся, когда ученики начнут пользоваться платформой.
        </div>
      ) : (
        <>
          {/* Карточки-метрики */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="Учеников зашло" value={String(stats.uniqueStudents)} hint="по device_session_id" />
            <MetricCard
              label="Дошли до голосового"
              value={String(stats.voiceStartersUnique)}
              hint={stats.voiceStarters > stats.voiceStartersUnique ? `${stats.voiceStarters} сессий всего` : "сессий"}
            />
            <MetricCard
              label="Средний балл"
              value={stats.averageScore !== null ? String(stats.averageScore) : "—"}
              hint={stats.scoredCount > 0 ? `по ${stats.scoredCount} заданиям` : "оценок нет"}
            />
            <MetricCard label="Всего событий" value={String(stats.totalEvents)} hint="в журнале" />
          </div>

          {/* Распределение по классам */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-primary-900">По классам</h2>
            {stats.byGrade.length === 0 ? (
              <p className="text-sm text-slate-500">Никто ещё не выбирал класс.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {stats.byGrade.map(({ grade, students }) => (
                  <div
                    key={grade}
                    className="flex min-w-[110px] flex-col items-center rounded-xl border border-primary-100 bg-primary-50 px-4 py-3"
                  >
                    <span className="text-sm font-medium text-slate-600">{grade} класс</span>
                    <span className="text-2xl font-bold text-primary-700">{students}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Последние события */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-primary-900">
              Последние {stats.recent.length} событий
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3 font-medium">Время</th>
                    <th className="py-2 pr-3 font-medium">Событие</th>
                    <th className="py-2 pr-3 font-medium">Класс</th>
                    <th className="py-2 pr-3 font-medium">Задание</th>
                    <th className="py-2 font-medium">Балл</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map((e, i) => (
                    <tr key={`${e.ts}-${i}`} className="border-b border-slate-100 last:border-0">
                      <td className="whitespace-nowrap py-2 pr-3 font-mono text-xs text-slate-500">
                        {formatTs(e.ts)}
                      </td>
                      <td className="py-2 pr-3 text-slate-700">{eventLabel(e.event_type)}</td>
                      <td className="py-2 pr-3 text-slate-700">{e.grade ?? "—"}</td>
                      <td className="max-w-[180px] truncate py-2 pr-3 font-mono text-xs text-slate-600">
                        {e.task_id ?? "—"}
                      </td>
                      <td className="py-2 text-slate-700">{e.score ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {stats.parseErrors > 0 && (
              <p className="mt-3 text-xs text-amber-600">
                Пропущено битых строк в журнале: {stats.parseErrors}
              </p>
            )}
          </section>
        </>
      )}
    </main>
  )
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-primary-800">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}
