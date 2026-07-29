"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useProgress } from "@/lib/useProgress"
import { useAnalytics } from "@/lib/useAnalytics"

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
 * vocab=emerald, listening=amber, speaking=rose. All class names are
 * string literals so Tailwind can see them.
 */
const SECTION_COLOR: Record<
  string,
  {
    header: string
    zone: string
    dot: string
    dotIdle: string
    connectorDone: string
    card: string
    ring: string
    currentRing: string
  }
> = {
  grammar: {
    header: "text-indigo-700",
    zone: "bg-indigo-50/70 border-indigo-100",
    dot: "bg-indigo-500",
    dotIdle: "bg-indigo-300",
    connectorDone: "bg-indigo-400",
    card: "bg-white border-indigo-200",
    ring: "hover:border-indigo-400",
    currentRing: "ring-indigo-400",
  },
  "to-be": {
    header: "text-teal-700",
    zone: "bg-teal-50/70 border-teal-100",
    dot: "bg-teal-500",
    dotIdle: "bg-teal-300",
    connectorDone: "bg-teal-400",
    card: "bg-white border-teal-200",
    ring: "hover:border-teal-400",
    currentRing: "ring-teal-400",
  },
  vocabulary: {
    header: "text-emerald-700",
    zone: "bg-emerald-50/70 border-emerald-100",
    dot: "bg-emerald-500",
    dotIdle: "bg-emerald-300",
    connectorDone: "bg-emerald-400",
    card: "bg-white border-emerald-200",
    ring: "hover:border-emerald-400",
    currentRing: "ring-emerald-400",
  },
  listening: {
    header: "text-amber-700",
    zone: "bg-amber-50/70 border-amber-100",
    dot: "bg-amber-500",
    dotIdle: "bg-amber-300",
    connectorDone: "bg-amber-400",
    card: "bg-white border-amber-200",
    ring: "hover:border-amber-400",
    currentRing: "ring-amber-400",
  },
  speaking: {
    header: "text-rose-700",
    zone: "bg-rose-50/70 border-rose-100",
    dot: "bg-rose-500",
    dotIdle: "bg-rose-300",
    connectorDone: "bg-rose-400",
    card: "bg-white border-rose-200",
    ring: "hover:border-rose-400",
    currentRing: "ring-rose-400",
  },
}
const DEFAULT_COLOR = SECTION_COLOR.grammar

/** Task type → island emoji (shown on the map island cards). */
const TYPE_ICON: Record<string, string> = {
  quiz: "❓",
  "fill-in": "✍️",
  cloze: "🧩",
  "drag-and-drop": "🧲",
  ladder: "🪜",
  "build-sentence": "🔧",
  "role-play": "🎭",
  "fill-in-and-speak": "🗣️",
  "voice-chat": "🎙️",
}
const DEFAULT_TYPE_ICON = "📝"

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

  // Per-grade client-side progress (localStorage, no backend — decision Q8).
  const { progress, completedCount, totalStars } = useProgress(grade)

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

  // The "current" island = first not-yet-completed task in map order
  // (decision Q12: Verb Bot stands on the current island).
  const currentKey = sections ? findCurrentTaskId(sections, progress) : null

  return (
    <div className="flex flex-col items-center px-4 py-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-indigo-900 mb-1">{grade} класс</h1>
      <p className="text-slate-500 mb-2">Карта заданий</p>
      {sections && sections.length > 0 && (
        <div className="text-sm text-indigo-600 mb-4 flex items-center gap-3">
          <span>
            Пройдено {completedCount} из {totalTasks}
          </span>
          {/* ⭐ total = sum of best scores (decision Q13). */}
          <span className="font-semibold text-amber-500">⭐ {totalStars}</span>
        </div>
      )}

      {/* World mini-navigation (decision Q12) — sticky jump bar. */}
      {sections && sections.length > 0 && (
        <div className="sticky top-2 z-40 flex justify-center gap-2 mb-6 bg-white/80 backdrop-blur rounded-full px-3 py-2 shadow border border-slate-100">
          {sections.map((s) => (
            <button
              key={s.meta.sectionId}
              onClick={() => scrollToWorld(s.meta.sectionId)}
              title={s.meta.title}
              className="w-9 h-9 rounded-full bg-white border border-slate-200 text-lg hover:scale-110 transition-transform"
            >
              {s.meta.icon}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="w-full text-center">
          <p className="text-slate-600 mb-6">Не удалось загрузить задания</p>
          <button
            onClick={() => router.push(`/class/${grade}`)}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors"
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
              className={`w-full mb-6 rounded-3xl border px-4 py-4 scroll-mt-20 ${color.zone}`}
            >
              {/* World header = transition between worlds (decision Q12):
                  icon + title + Verb Bot greeting. */}
              <div className="flex items-start gap-3 mb-4">
                <span className="text-3xl">{s.meta.icon}</span>
                <div className="min-w-0">
                  <div className={`font-bold text-lg ${color.header}`}>{s.meta.title}</div>
                  <div className="text-xs text-slate-500">{s.meta.desc}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 italic">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/mascot/happy.jpg" alt="Verb Bot" className="w-5 h-5 rounded-full object-cover" />
                    {s.meta.greeting}
                  </div>
                </div>
                <div className={`ml-auto text-xs font-semibold whitespace-nowrap ${color.header}`}>
                  {doneCount}/{s.tasks.length}
                </div>
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
                      <span className="mr-1">{TYPE_ICON[t.type] ?? DEFAULT_TYPE_ICON}</span>
                      <span className="text-slate-700">{t.title}</span>
                      {done && (
                        <span className="ml-1 text-xs text-emerald-600 font-semibold whitespace-nowrap">
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

      {/* Finish flag when the whole map is completed. */}
      {sections && totalTasks > 0 && completedCount === totalTasks && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4 text-center"
        >
          <div className="text-2xl mb-1">🏁</div>
          <div className="font-bold text-amber-700">Все задания пройдены!</div>
          <div className="text-xs text-slate-500">Ты — герой глаголов! Можно повторить любое задание.</div>
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
