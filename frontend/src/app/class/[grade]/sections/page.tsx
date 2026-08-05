"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useProgress } from "@/lib/useProgress"
import { useAnalytics } from "@/lib/useAnalytics"
import { portalPercent, portalOpenedKey } from "@/lib/portal"
import { WorldIcon } from "@/components/WorldIcon"
import { TaskIcon } from "@/components/icons/task-icons"
import { Confetti } from "@/components/Confetti"

type Category = "grammar" | "to-be" | "vocabulary" | "listening" | "speaking"

interface Exercise {
  file: string
  title: string
  category: Category
  type: string
}

interface IndexJson {
  grade: number
  exercises: Exercise[]
}

interface SectionMeta {
  /** slug used in the route `/class/[grade]/sections/[section]/[taskId]` */
  sectionId: string
  title: string
  icon: string
  desc: string
  /** Verb Bot greeting shown when entering this world (decision Q12) */
  greeting: string
}

/**
 * Category → world config (decisions Q10-Q12): the sections page is a
 * vertical map of "worlds", one per category. Defines render order and
 * preserves the exact icon / title / desc shown in the old hardcoded UI.
 */
const SECTION_META: Record<Category, SectionMeta> = {
  grammar: {
    sectionId: "grammar",
    title: "Грамматика",
    icon: "✏️",
    desc: "Окончания, вопросы, наречия",
    greeting: "Добро пожаловать в Долину Грамматики!",
  },
  "to-be": {
    sectionId: "tobe",
    title: "Глагол to be",
    icon: "🤖",
    desc: "Формы глагола to be: am / is / are",
    greeting: "Это мой дом — Город To Be!",
  },
  vocabulary: {
    sectionId: "vocab",
    title: "Словарный запас",
    icon: "📚",
    desc: "Лексика и тексты",
    greeting: "Вперёд, через Лес Слов!",
  },
  listening: {
    sectionId: "listen",
    title: "Аудирование",
    icon: "🎧",
    desc: "Прослушивание и role-play",
    greeting: "Тихо! Это Пещера Звуков!",
  },
  speaking: {
    sectionId: "speak",
    title: "Свободное общение",
    icon: "🗣️",
    desc: "Голосовые задания с AI",
    greeting: "Вершина Разговоров! Давай говорить!",
  },
}

/**
 * World accent colors (decision Q11): grammar=indigo, to-be=teal,
 * vocab=emerald, listening=amber, speaking=rose. Semantic tokens from
 * DESIGN.md (--color-grammar-*, --color-tobe-*, ...) — same hues as phase 1,
 * now exported from the design system. All class names are string literals
 * so Tailwind can see them.
 */
const SECTION_COLOR: Record<
  string,
  {
    header: string
    zone: string
    pattern: string
    dot: string
    dotIdle: string
    connectorDone: string
    card: string
    ring: string
    currentRing: string
  }
> = {
  grammar: {
    header: "text-grammar-800",
    zone: "bg-gradient-to-br from-grammar-100/80 via-grammar-50/60 to-white border-grammar-200/80 shadow-sm shadow-grammar-100/60",
    pattern: "pattern-scrolls",
    dot: "bg-grammar-500 shadow shadow-grammar-300/70",
    dotIdle: "bg-grammar-300",
    connectorDone: "bg-grammar-400",
    card: "bg-white border-grammar-200",
    ring: "hover:border-grammar-400 hover:shadow-lg hover:shadow-grammar-100/70",
    currentRing: "ring-grammar-400",
  },
  "to-be": {
    header: "text-tobe-800",
    zone: "bg-gradient-to-br from-tobe-100/80 via-tobe-50/60 to-white border-tobe-200/80 shadow-sm shadow-tobe-100/60",
    pattern: "pattern-stars",
    dot: "bg-tobe-500 shadow shadow-tobe-300/70",
    dotIdle: "bg-tobe-300",
    connectorDone: "bg-tobe-400",
    card: "bg-white border-tobe-200",
    ring: "hover:border-tobe-400 hover:shadow-lg hover:shadow-tobe-100/70",
    currentRing: "ring-tobe-400",
  },
  vocabulary: {
    header: "text-vocabulary-800",
    zone: "bg-gradient-to-br from-vocabulary-100/80 via-vocabulary-50/60 to-white border-vocabulary-200/80 shadow-sm shadow-vocabulary-100/60",
    pattern: "pattern-leaves",
    dot: "bg-vocabulary-500 shadow shadow-vocabulary-300/70",
    dotIdle: "bg-vocabulary-300",
    connectorDone: "bg-vocabulary-400",
    card: "bg-white border-vocabulary-200",
    ring: "hover:border-vocabulary-400 hover:shadow-lg hover:shadow-vocabulary-100/70",
    currentRing: "ring-vocabulary-400",
  },
  listening: {
    header: "text-listening-800",
    zone: "bg-gradient-to-br from-listening-100/80 via-listening-50/60 to-white border-listening-200/80 shadow-sm shadow-listening-100/60",
    pattern: "pattern-notes",
    dot: "bg-listening-500 shadow shadow-listening-300/70",
    dotIdle: "bg-listening-300",
    connectorDone: "bg-listening-400",
    card: "bg-white border-listening-200",
    ring: "hover:border-listening-400 hover:shadow-lg hover:shadow-listening-100/70",
    currentRing: "ring-listening-400",
  },
  speaking: {
    header: "text-speaking-800",
    zone: "bg-gradient-to-br from-speaking-100/80 via-speaking-50/60 to-white border-speaking-200/80 shadow-sm shadow-speaking-100/60",
    pattern: "pattern-spotlights",
    dot: "bg-speaking-500 shadow shadow-speaking-300/70",
    dotIdle: "bg-speaking-300",
    connectorDone: "bg-speaking-400",
    card: "bg-white border-speaking-200",
    ring: "hover:border-speaking-400 hover:shadow-lg hover:shadow-speaking-100/70",
    currentRing: "ring-speaking-400",
  },
}
const DEFAULT_COLOR = SECTION_COLOR.grammar

/** Icon color + icon box per world (design/opendesign, WorldIcon SVGs). */
const NAV_ICON: Record<string, string> = {
  grammar: "text-grammar-600",
  "to-be": "text-tobe-600",
  vocabulary: "text-vocabulary-600",
  listening: "text-listening-600",
  speaking: "text-speaking-600",
}
const ICON_BOX: Record<string, string> = {
  grammar: "bg-grammar-50 border-grammar-200",
  "to-be": "bg-tobe-50 border-tobe-200",
  vocabulary: "bg-vocabulary-50 border-vocabulary-200",
  listening: "bg-listening-50 border-listening-200",
  speaking: "bg-speaking-50 border-speaking-200",
}

/** Render order: skip categories that have no exercises. */
const SECTION_ORDER: Category[] = ["grammar", "to-be", "vocabulary", "listening", "speaking"]

interface MapTask {
  id: string
  title: string
  type: string
}

interface Section {
  meta: SectionMeta
  category: Category
  tasks: MapTask[]
}

function groupExercises(exercises: Exercise[]): Section[] {
  const byCategory: Record<Category, MapTask[]> = {
    grammar: [],
    "to-be": [],
    vocabulary: [],
    listening: [],
    speaking: [],
  }
  for (const ex of exercises) {
    // Unknown categories are ignored — keeps the UI stable.
    if (byCategory[ex.category]) {
      byCategory[ex.category].push({
        id: ex.file.replace(/\.json$/, ""),
        title: ex.title,
        type: ex.type,
      })
    }
  }
  return SECTION_ORDER.map((cat) => ({
    meta: SECTION_META[cat],
    category: cat,
    tasks: byCategory[cat],
  })).filter((s) => s.tasks.length > 0)
}

interface UsefulLink {
  title: string
  url: string
  description?: string
}

/** First incomplete task in map order, or null when everything is done. */
function findCurrentTaskId(
  sections: Section[],
  progress: Record<string, unknown>
): string | null {
  for (const s of sections) {
    for (const t of s.tasks) {
      if (!progress[t.id]) return t.id
    }
  }
  return null
}

export default function SectionsPage() {
  const { grade } = useParams<{ grade: string }>()
  const router = useRouter()

  const [sections, setSections] = useState<Section[] | null>(null)
  const [error, setError] = useState(false)
  // Useful links (decision Q2/Q9) — loaded from links.json, separate from the
  // graded exercises. Contains songs/videos for self-study.
  const [links, setLinks] = useState<UsefulLink[] | null>(null)

  // W1-T2 «Сюжет портала»: финальная сцена «Портал открыт!» показывается
  // один раз на класс (флаг в localStorage, формат tmp_portal_grade_N_opened).
  const [showPortalCelebration, setShowPortalCelebration] = useState(false)

  // Per-grade client-side progress (localStorage, no backend — decision Q8).
  // W1-T1: две валюты — ⚡ Energy (не-голосовые) и 🗣 Communication
  // (голосовые); totalStars переименован в energyTotal.
  const { progress, completedCount, energyTotal, commTotal, perfectCount } = useProgress(grade)

  const { track } = useAnalytics()
  useEffect(() => {
    track({ event_type: "section_selected", grade: Number(grade) })
  }, [grade, track])

  useEffect(() => {
    let cancelled = false
    setSections(null)
    setError(false)
    fetch(`/content/tasks/grade_${grade}/index.json`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as IndexJson
        if (cancelled) return
        setSections(groupExercises(data.exercises))
      })
      .catch((err) => {
        if (cancelled) return
        console.error("[SectionsPage] Failed to load index.json", err)
        setError(true)
      })
    fetch(`/content/tasks/grade_${grade}/links.json`)
      .then(async (res) => {
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        if (Array.isArray(data.links)) setLinks(data.links)
      })
      .catch(() => {
        // links.json missing or invalid — silently skip (section hidden).
      })
    return () => {
      cancelled = true
    }
  }, [grade])

  // Refs for the world mini-navigation (jump to a world, decision Q12).
  const worldRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const scrollToWorld = (sectionId: string) => {
    worldRefs.current[sectionId]?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const totalTasks = sections ? sections.reduce((sum, s) => sum + s.tasks.length, 0) : 0

  // W1-T2: % восстановления портала (completedCount / total × 100, 0..100).
  const portalPct = portalPercent(completedCount, totalTasks)

  // W1-T2: сообщаем Verb Bot о прогрессе портала (реплики при росте).
  // Событие шлём при каждом изменении счётчиков — бот сравнивает с
  // последним значением и комментирует только РОСТ после завершения задания.
  useEffect(() => {
    if (totalTasks <= 0) return
    window.dispatchEvent(
      new CustomEvent("verb-bot:portal-progress", {
        detail: { completedCount, totalTasks },
      })
    )
  }, [completedCount, totalTasks])

  // W1-T2: финальная сцена — оверлей «Портал открыт!» при 100% класса.
  // Показывается один раз на класс (флаг в localStorage).
  useEffect(() => {
    if (totalTasks <= 0 || completedCount < totalTasks) return
    try {
      if (localStorage.getItem(portalOpenedKey(grade))) return
      setShowPortalCelebration(true)
    } catch {
      /* ignore unavailable storage */
    }
  }, [completedCount, totalTasks, grade])

  const closePortalCelebration = () => {
    try {
      localStorage.setItem(portalOpenedKey(grade), "1")
    } catch {
      /* ignore unavailable storage */
    }
    setShowPortalCelebration(false)
  }

  // The "current" island = first not-yet-completed task in map order
  // (decision Q12: Verb Bot stands on the current island).
  const currentKey = sections ? findCurrentTaskId(sections, progress) : null

  return (
    <div className="flex flex-col items-center px-4 py-8 max-w-2xl mx-auto">
      {/* Кнопка «← Назад» — обратно к выбору класса (стиль TaskHeader). */}
      <button
        onClick={() => router.push("/class")}
        className="mb-4 flex min-h-[44px] min-w-[44px] items-center justify-center self-start rounded-2xl bg-primary-100 px-3 py-2 text-base font-bold text-primary-700 transition-colors hover:bg-primary-200"
      >
        ← Назад
      </button>
      <h1 className="font-display mb-1 text-3xl font-extrabold tracking-tight text-primary-900">
        {grade} класс
      </h1>
      <p className="mb-2 text-slate-500">Карта заданий</p>
      {sections && sections.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2 text-sm font-bold">
          <span className="rounded-full border border-slate-100 bg-white/80 px-3 py-1.5 text-slate-600 shadow-soft">
            Пройдено {completedCount} из {totalTasks}
          </span>
          {/* ⚡ energy = сумма лучших результатов за не-голосовые задания
              (тикет W1-T1; старое ⭐ перечитывается как ⚡). Цифры — Unbounded
              (реш. 8: «2–3 места на экран» — XP-цифры как раз такое место). */}
          <span className="rounded-full border border-listening-200 bg-listening-100 px-3 py-1.5 text-listening-800 shadow-soft">
            <span className="font-display-alt font-bold">⚡ {energyTotal}</span>
          </span>
          {/* 🗣 comm = сумма лучших результатов за голосовые задания (W1-T1). */}
          <span className="rounded-full border border-speaking-200 bg-speaking-100 px-3 py-1.5 text-speaking-800 shadow-soft">
            <span className="font-display-alt font-bold">🗣 {commTotal}</span>
          </span>
          {/* 💎 per perfect task (decision Q13). */}
          <span className="rounded-full border border-vocabulary-200 bg-vocabulary-100 px-3 py-1.5 text-vocabulary-800 shadow-soft">
            <span className="font-display-alt font-bold">💎 {perfectCount}</span>
          </span>
          {/* W1-T2 «Сюжет портала»: индикатор восстановления портала —
              completedCount / total заданий класса × 100. Полоса — токены
              primary-*, скругление rounded-2xl; встаёт отдельной строкой
              (w-full в flex-wrap), карту миров не перекрывает. */}
          {totalTasks > 0 && (
            <div className="w-full rounded-2xl border border-primary-200 bg-white/80 px-3 py-2 shadow-soft">
              <div className="mb-1 flex items-center justify-between gap-2 text-sm font-bold">
                <span className="text-primary-800">Портал восстановлен на {portalPct}%</span>
                <span className="text-xs font-semibold text-primary-500">
                  {completedCount}/{totalTasks}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-primary-100">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${portalPct}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* World mini-navigation (decision Q12) — sticky jump bar. */}
      {sections && sections.length > 0 && (
        <div className="sticky top-2 z-40 flex justify-center gap-2 mb-6 bg-white/80 backdrop-blur rounded-full px-3 py-2 shadow-soft border border-slate-100">
          {sections.map((s) => (
            <button
              key={s.meta.sectionId}
              onClick={() => scrollToWorld(s.meta.sectionId)}
              title={s.meta.title}
              className={`flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-soft transition-transform hover:scale-110 ${NAV_ICON[s.category]}`}
            >
              <WorldIcon world={s.category} className="h-5 w-5" />
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="w-full text-center">
          <p className="text-slate-600 mb-6">Не удалось загрузить задания</p>
          <button
            onClick={() => router.push(`/class/${grade}`)}
            className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm hover:bg-primary-700 transition-colors"
          >
            Назад
          </button>
        </div>
      )}

      {!error && !sections && <p className="text-slate-500">Загрузка...</p>}

      {sections &&
        sections.map((s, si) => {
          const color = SECTION_COLOR[s.category] ?? DEFAULT_COLOR
          const doneCount = s.tasks.filter((t) => progress[t.id]).length
          return (
            <motion.div
              key={s.meta.sectionId}
              ref={(el) => {
                worldRefs.current[s.meta.sectionId] = el
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: si * 0.08 }}
              className={`relative w-full mb-6 overflow-hidden rounded-3xl border px-4 py-4 scroll-mt-20 ${color.zone}`}
            >
              {/* World zone pattern (design-boost, реш. 3/6) — лёгкий SVG-декор
                  по теме мира: свитки/звёзды/листья/ноты/софиты. */}
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 opacity-[0.07] ${color.pattern}`}
              />
              {/* World header = transition between worlds (decision Q12):
                  icon + title + Verb Bot greeting. */}
              <div className="flex items-start gap-3 mb-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-soft ${ICON_BOX[s.category]} ${NAV_ICON[s.category]}`}
                >
                  <WorldIcon world={s.category} className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`font-display text-lg font-extrabold ${color.header}`}>
                    {s.meta.title}
                  </div>
                  <div className="text-xs text-slate-500">{s.meta.desc}</div>
                  <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/80 bg-white/70 px-3 py-1.5 shadow-soft">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/mascot/happy.jpg"
                      alt="Verb Bot"
                      className="h-6 w-6 rounded-full object-cover"
                    />
                    <p className="text-xs font-medium leading-snug text-slate-600">
                      {s.meta.greeting}
                    </p>
                  </div>
                </div>
                <div className={`ml-auto whitespace-nowrap text-xs font-bold ${color.header}`}>
                  {doneCount}/{s.tasks.length}
                </div>
              </div>

              {/* World progress bar (design/opendesign) — fills with the
                  world accent as islands are completed. */}
              <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-white/80">
                <motion.div
                  className={`h-full rounded-full ${color.dot}`}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${s.tasks.length > 0 ? (doneCount / s.tasks.length) * 100 : 0}%`,
                  }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                />
              </div>

              {/* Vertical trail of islands (decision Q11). Each island row is
                  a 3-column grid: card | center dot | card — cards alternate
                  sides, the center column forms the path. */}
              <div>
                {s.tasks.map((t, ti) => {
                  const done = Boolean(progress[t.id])
                  const prevDone = ti > 0 && Boolean(progress[s.tasks[ti - 1].id])
                  const isCurrent = currentKey === t.id
                  const card = (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-20px" }}
                      onClick={() => {
                        track({
                          event_type: "task_started",
                          grade: Number(grade),
                          task_id: t.id,
                          section_id: s.meta.sectionId,
                        })
                        router.push(`/class/${grade}/sections/${s.meta.sectionId}/${t.id}`)
                      }}
                      className={`text-left px-3 py-2 rounded-xl border text-sm transition-all max-w-full ${
                        done ? "opacity-70" : ""
                      } ${color.card} ${color.ring} ${isCurrent ? `ring-2 ${color.currentRing} shadow-md` : "hover:shadow-md"}`}
                    >
                      <TaskIcon type={t.type} className="mr-1 h-4 w-4 shrink-0 align-[-2px]" />
                      <span className="text-slate-700">{t.title}</span>
                      {done && (
                        <span className="ml-1 text-xs text-vocabulary-600 font-semibold whitespace-nowrap">
                          ✓ {progress[t.id].score}/{progress[t.id].total}
                          {/* 💎 badge for a 100% run (decision Q13). */}
                          {progress[t.id].total > 0 &&
                            progress[t.id].score === progress[t.id].total &&
                            " 💎"}
                        </span>
                      )}
                    </motion.button>
                  )
                  return (
                    <div key={t.id}>
                      {/* Connector segment above this island — fills with the
                          world color once the previous island is completed. */}
                      {ti > 0 && (
                        <div
                          className={`mx-auto w-1 h-5 rounded ${
                            prevDone ? color.connectorDone : "bg-slate-300/70"
                          }`}
                        />
                      )}
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <div className="flex justify-end min-w-0">{ti % 2 === 0 ? card : null}</div>
                        <div
                          className={`w-4 h-4 rounded-full border-2 border-white shadow shrink-0 ${
                            done ? color.dot : color.dotIdle
                          } ${isCurrent ? "ring-2 ring-offset-1 " + color.currentRing : ""}`}
                        />
                        <div className="flex justify-start min-w-0">
                          {ti % 2 === 1 ? card : null}
                          {/* Verb Bot stands on the current island (Q12). */}
                          {isCurrent && (
                            <motion.div
                              className={`flex items-center gap-1 ${ti % 2 === 1 ? "ml-2" : ""}`}
                              animate={{ y: [0, -4, 0] }}
                              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src="/mascot/cheer.jpg"
                                alt="Verb Bot"
                                className="w-9 h-9 rounded-full object-cover shadow border-2 border-white"
                              />
                              <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                                Ты здесь!
                              </span>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )
        })}

      {/* W1-T2 «Сюжет портала»: финальная сцена при 100% класса — оверлей
          «Портал открыт!» + конфетти (переиспользуем Confetti). Показывается
          один раз на класс: флаг tmp_portal_grade_N_opened в localStorage,
          кнопка «Продолжить» закрывает. */}
      {showPortalCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white px-6 py-8 text-center shadow-2xl">
            <Confetti count={40} />
            <div className="relative mb-2 text-6xl">🎉</div>
            <h2 className="font-display relative text-3xl font-extrabold text-primary-900">
              Портал открыт!
            </h2>
            <p className="relative mt-2 text-sm text-slate-500">
              Ты восстановил портал — теперь можно путешествовать по мирам времени!
            </p>
            <button
              onClick={closePortalCelebration}
              className="relative mt-5 min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
            >
              Продолжить
            </button>
          </div>
        </div>
      )}

      {/* Finish flag when the whole map is completed. */}
      {sections && totalTasks > 0 && completedCount === totalTasks && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative mb-6 w-full overflow-hidden rounded-3xl border border-listening-200 bg-listening-50 px-4 py-4 text-center"
        >
          <Confetti count={22} />
          <div className="relative mb-1 text-2xl">🏁</div>
          <div className="relative font-display font-extrabold text-listening-700">
            Все задания пройдены!
          </div>
          <div className="relative text-xs text-slate-500">
            Ты — герой глаголов! Можно повторить любое задание.
          </div>
        </motion.div>
      )}

      {/* Useful links (decision Q2/Q9) — songs/videos for self-study.
          Links open in a new tab. Hidden if links.json is absent/empty. */}
      {links && links.length > 0 && (
        <div className="w-full mb-6 rounded-3xl border border-sky-100 bg-sky-50/70 px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">🎵</span>
            <div>
              <div className="font-bold text-lg text-sky-700">Полезное</div>
              <div className="text-xs text-slate-500">Песенки и материалы для самостоятельного изучения</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {links.map((l, li) => (
              <motion.a
                key={li}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: li * 0.05 }}
                className="flex flex-col px-3 py-2 rounded-xl border text-sm text-slate-700 hover:shadow-md transition-all bg-white border-sky-200 hover:border-sky-400"
              >
                <span className="font-medium text-sky-800">▶ {l.title}</span>
                {l.description && (
                  <span className="text-xs text-slate-500 mt-0.5">{l.description}</span>
                )}
              </motion.a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
