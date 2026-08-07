"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Confetti } from "@/components/Confetti"
import {
  type ExamProgress,
  type ExamSector,
  type StationProgress,
  EXAM_COMPLETED_KEY,
  EXAM_LAST_TASK_ID,
  examLastStationPassed,
  examPercent,
  examSectorStationsDone,
  examStationsDone,
  examStationsTotal,
} from "@/lib/exam"

interface MiniTestItem {
  sentence: string
  answer: string
  note: string
}

interface ExamIndexJson {
  exam: string
  title: string
  subtitle?: string
  icon?: string
  intro?: {
    panel: { title: string; text: string }[]
    principle: string[]
    miniTest: MiniTestItem[]
  }
  sectors: ExamSector[]
}

/** Читаем tmp_progress_grade_exam (grade = "exam", lib/exam.ts). */
function readExamProgress(): ExamProgress {
  try {
    const raw = localStorage.getItem("tmp_progress_grade_exam")
    return raw ? (JSON.parse(raw) as Record<string, StationProgress>) : {}
  } catch {
    return {}
  }
}

const SECTOR_EMOJI: Record<string, string> = {
  "sector-1": "📸",
  "sector-2": "📜",
  "sector-3": "🔮",
  "sector-4": "👑",
}

/** Мини-тест «Проверь себя» (пролог, doc: Шаг 3) — проще, чем EpochTheory:
 *  статичный блок + 6 fill-in строк с самопроверкой по ответам из doc. */
function ExamMiniTest({ items }: { items: MiniTestItem[] }) {
  const [values, setValues] = useState<string[]>(() => items.map(() => ""))
  const [verdicts, setVerdicts] = useState<(boolean | null)[]>(() => items.map(() => null))
  const [showAll, setShowAll] = useState(false)

  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ")

  const check = (i: number) => {
    setVerdicts((prev) => {
      const next = [...prev]
      next[i] = normalize(values[i]) === normalize(items[i].answer)
      return next
    })
  }

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-lg font-extrabold text-primary-900">
          🎮 Проверь себя (Мини-тест на 12 времен)
        </h3>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="min-h-[44px] rounded-2xl bg-primary-100 px-3 py-2 text-sm font-bold text-primary-700 transition-colors hover:bg-primary-200"
        >
          {showAll ? "Скрыть ответы" : "Показать ответы"}
        </button>
      </div>
      <p className="mb-3 text-sm text-slate-500">
        Раскрой скобки, используя ЛЮБОЕ подходящее время.
      </p>
      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <div
            key={i}
            className={`rounded-2xl border bg-white px-3 py-2 shadow-soft transition-colors ${
              verdicts[i] === true
                ? "border-success"
                : verdicts[i] === false
                  ? "border-danger"
                  : "border-primary-200"
            }`}
          >
            <p className="mb-2 text-sm font-semibold text-slate-700">{item.sentence}</p>
            <div className="flex items-center gap-2">
              <input
                value={values[i]}
                onChange={(e) =>
                  setValues((prev) => {
                    const next = [...prev]
                    next[i] = e.target.value
                    return next
                  })
                }
                placeholder="Твой ответ"
                className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-primary-200 bg-primary-50/50 px-3 text-sm font-semibold text-primary-900 outline-none transition-colors focus:border-primary-400"
              />
              <button
                type="button"
                onClick={() => check(i)}
                className="min-h-[44px] shrink-0 rounded-2xl bg-primary-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-700"
              >
                Проверить
              </button>
            </div>
            {(verdicts[i] !== null || showAll) && (
              <p
                className={`mt-2 text-xs font-bold ${
                  verdicts[i] === false || (showAll && verdicts[i] === null)
                    ? "text-slate-500"
                    : "text-success"
                }`}
              >
                {item.answer}
                {item.note ? ` (${item.note})` : ""}
                {verdicts[i] === true ? " — ✓" : verdicts[i] === false ? " — ✗" : ""}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * T14: страница финального экзамена /exam «Великий Экзамен Времен».
 * Пролог-инструктаж (панель времён + главный принцип + мини-тест), 4 сектора
 * (Q2 — все открыты) со станциями, «← Назад» → /mission. После прохождения
 * ПОСЛЕДНЕЙ станции (exam_s4_station_6) — экран-достижение «ВЫ ВЛАДЕЕТЕ
 * ВРЕМЕНЕМ!» + Confetti, 1 раз (флаг tmp_exam_completed, паттерн портала T12).
 */
export default function ExamPage() {
  const router = useRouter()
  const [data, setData] = useState<ExamIndexJson | null>(null)
  const [error, setError] = useState(false)
  const [progress, setProgress] = useState<ExamProgress>({})
  const [showVictory, setShowVictory] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/content/exam/index.json")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as ExamIndexJson
        if (cancelled) return
        setData(json)
      })
      .catch((err) => {
        if (cancelled) return
        console.error("[ExamPage] Failed to load index.json", err)
        setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Гидрация прогресса после монтирования (SSR-safe).
  useEffect(() => {
    setProgress(readExamProgress())
  }, [])

  const sectors = data?.sectors ?? []
  const totalStations = examStationsTotal(sectors)
  const doneStations = examStationsDone(progress, sectors)
  const examPct = examPercent(progress, sectors)

  // Финал «ВЫ ВЛАДЕЕТЕ ВРЕМЕНЕМ!» — после последней станции, 1 раз (флаг).
  useEffect(() => {
    if (!examLastStationPassed(progress)) return
    try {
      if (localStorage.getItem(EXAM_COMPLETED_KEY)) return
      setShowVictory(true)
    } catch {
      /* ignore unavailable storage */
    }
  }, [progress])

  const closeVictory = () => {
    try {
      localStorage.setItem(EXAM_COMPLETED_KEY, "1")
    } catch {
      /* ignore unavailable storage */
    }
    setShowVictory(false)
  }

  const intro = data?.intro

  return (
    <div className="flex flex-col items-center px-4 py-8 max-w-2xl mx-auto">
      {/* Кнопка «← Назад» — к карте эпох (стиль TaskHeader). */}
      <button
        onClick={() => router.push("/mission")}
        className="mb-4 flex min-h-[44px] min-w-[44px] items-center justify-center self-start rounded-2xl bg-primary-100 px-3 py-2 text-base font-bold text-primary-700 transition-colors hover:bg-primary-200"
      >
        ← Назад
      </button>

      <div className="mb-2 flex items-center gap-3">
        <span className="text-4xl" aria-hidden="true">
          {data?.icon ?? "👑"}
        </span>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-primary-900">
          {data?.title ?? "Великий Экзамен Времен"}
        </h1>
      </div>
      <p className="mb-4 text-center text-slate-500">{data?.subtitle ?? ""}</p>

      {error && (
        <div className="w-full text-center">
          <p className="text-slate-600 mb-6">Не удалось загрузить экзамен</p>
          <button
            onClick={() => router.push("/mission")}
            className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm hover:bg-primary-700 transition-colors"
          >
            Назад
          </button>
        </div>
      )}

      {!error && !data && <p className="text-slate-500">Загрузка...</p>}

      {/* Пролог-инструктаж: панель времён + главный принцип + мини-тест. */}
      {data && intro && (
        <div className="mb-8 w-full rounded-3xl border border-primary-200 bg-gradient-to-br from-primary-50/80 via-white to-white px-4 py-4 shadow-soft">
          <h2 className="font-display mb-1 text-xl font-black tracking-tight text-primary-900">
            🗺️ Панель Управления Временами
          </h2>
          <p className="mb-3 text-sm text-slate-500">
            Привет, Творец Времени! 👋 Ты прошел огромный путь. У тебя в руках теперь 12
            шестеренок, из которых состоит механизм английского языка. Перед финальным
            испытанием давай посмотрим на панель управления.
          </p>
          <div className="mb-4 flex flex-col gap-2">
            {intro.panel.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-primary-100 bg-white px-3 py-2 shadow-sm"
              >
                <p className="text-sm font-black text-primary-800">{p.title}</p>
                <p className="text-sm font-semibold leading-snug text-slate-600">{p.text}</p>
              </div>
            ))}
          </div>

          <h2 className="font-display mb-1 text-xl font-black tracking-tight text-primary-900">
            ⚙️ Главный принцип работы механизма
          </h2>
          <p className="mb-3 text-sm text-slate-500">
            На экзамене никто не спрашивает у тебя формулы. Спрашивают СМЫСЛ. Перед тем как
            выбрать ответ, задай себе 3 вопроса:
          </p>
          <div className="mb-4 flex flex-col gap-2">
            {intro.principle.map((q, i) => (
              <div
                key={i}
                className="rounded-2xl border border-primary-100 bg-white px-3 py-2 shadow-sm"
              >
                <p className="text-sm font-bold leading-snug text-slate-700">
                  {i + 1}. {q}
                </p>
              </div>
            ))}
          </div>

          <ExamMiniTest items={intro.miniTest} />
        </div>
      )}

      {/* Прогресс экзамена. */}
      {totalStations > 0 && (
        <div className="mb-6 w-full rounded-2xl border border-amber-200 bg-white/80 px-3 py-2 shadow-soft">
          <div className="mb-1 flex items-center justify-between gap-2 text-sm font-bold">
            <span className="text-amber-800">Экзамен пройден на {examPct}%</span>
            <span className="text-xs font-semibold text-amber-600">
              {doneStations}/{totalStations} станций
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-amber-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600"
              initial={{ width: 0 }}
              animate={{ width: `${examPct}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
        </div>
      )}

      {/* 4 сектора: ВСЕ открыты (Q2), станции кликабельны. */}
      <h2 className="font-display mb-3 w-full text-xl font-black tracking-tight text-primary-900">
        Секторы
      </h2>
      {sectors.map((sector, si) => {
        const done = examSectorStationsDone(progress, si, sector)
        const pct = Math.round((done / Math.max(1, sector.stations.length)) * 100)
        const emoji = sector.icon ?? SECTOR_EMOJI[sector.id] ?? "🛸"
        return (
          <motion.div
            key={sector.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: si * 0.08 }}
            className="relative mb-4 w-full overflow-hidden rounded-3xl border border-primary-200 bg-gradient-to-br from-primary-50/80 via-white to-white px-4 py-4 shadow-sm"
          >
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary-200 bg-primary-50 text-2xl shadow-soft">
                {emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-lg font-extrabold text-primary-900">
                  {sector.title}
                </div>
                {sector.story && (
                  <div className="mt-0.5 text-xs text-slate-500">{sector.story}</div>
                )}
              </div>
            </div>

            {/* Прогресс сектора: N из M станций ✓ + полоса. */}
            <div className="mb-2 flex items-center justify-between text-xs font-bold">
              <span className="text-slate-500">
                {done} из {sector.stations.length} станций ✓
              </span>
              <span className="text-primary-600">{pct}%</span>
            </div>
            <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-primary-100">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>

            {/* Станции сектора: свободный порядок, все открыты. */}
            <div className="grid w-full gap-2">
              {sector.stations.map((station, sti) => {
                const taskId = `exam_s${si + 1}_station_${sti + 1}`
                const entry = progress[taskId]
                const passed = Boolean(entry && entry.score > 0)
                return (
                  <motion.button
                    key={station.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: si * 0.08 + sti * 0.04 }}
                    onClick={() => router.push(`/exam/${sector.id}/${station.id}`)}
                    className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border border-primary-200 bg-white px-4 py-2.5 text-left shadow-soft transition-colors hover:bg-primary-50 active:bg-primary-100"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                        passed ? "bg-success text-white" : "bg-primary-100 text-primary-700"
                      }`}
                    >
                      {passed ? "✓" : sti + 1}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-bold text-primary-900">
                      {station.title}
                    </span>
                    {passed && entry && (
                      <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-xs font-black text-success">
                        {entry.score}/{entry.total}
                      </span>
                    )}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )
      })}

      {/* Финал: экран-достижение «ВЫ ВЛАДЕЕТЕ ВРЕМЕНЕМ!» + Confetti, 1 раз. */}
      {showVictory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white px-6 py-8 text-center shadow-2xl">
            <Confetti count={80} />
            <div className="relative mb-2 text-6xl">👑</div>
            <h2 className="font-display relative text-3xl font-extrabold leading-tight text-primary-900">
              ВЫ ВЛАДЕЕТЕ ВРЕМЕНЕМ!
            </h2>
            <p className="relative mt-3 text-sm font-black uppercase tracking-wide text-amber-600">
              12 времён английского глагола покорены.
            </p>
            <p className="relative mt-1 text-sm font-bold text-slate-600">
              Вы готовы к экзамену!
            </p>
            <button
              onClick={closeVictory}
              className="relative mt-6 min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
            >
              Продолжить
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
