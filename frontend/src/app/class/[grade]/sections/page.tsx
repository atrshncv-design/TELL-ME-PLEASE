"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useProgress } from "@/lib/useProgress"
import { useAnalytics } from "@/lib/useAnalytics"

type Category = "grammar" | "vocabulary" | "listening" | "speaking"

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
}

/**
 * Category → UI section config. Defines the order sections render in
 * (grammar, vocabulary, listening, speaking) and preserves the exact
 * icon / title / desc shown in the old hardcoded UI.
 */
const SECTION_META: Record<Category, SectionMeta> = {
  grammar: {
    sectionId: "grammar",
    title: "Грамматика",
    icon: "✏️",
    desc: "Окончания, вопросы, наречия",
  },
  vocabulary: {
    sectionId: "vocab",
    title: "Словарный запас",
    icon: "📚",
    desc: "Лексика и тексты",
  },
  listening: {
    sectionId: "listen",
    title: "Аудирование",
    icon: "🎧",
    desc: "Прослушивание и role-play",
  },
  speaking: {
    sectionId: "speak",
    title: "Свободное общение",
    icon: "🗣️",
    desc: "Голосовые задания с AI",
  },
}

/**
 * Category → accent colors. Per decision Q9 each section gets a distinct
 * accent so students can visually orient (grammar=indigo, vocab=emerald,
 * listening=amber, speaking=rose). `accent` colors the header title,
 * `badge` is the card background/border, `ring` is the hover border.
 * Unknown categories fall back to indigo.
 */
const SECTION_COLOR: Record<string, { accent: string; badge: string; ring: string }> = {
  grammar: {
    accent: "text-indigo-700",
    badge: "bg-indigo-50 border-indigo-200",
    ring: "hover:border-indigo-400",
  },
  vocabulary: {
    accent: "text-emerald-700",
    badge: "bg-emerald-50 border-emerald-200",
    ring: "hover:border-emerald-400",
  },
  listening: {
    accent: "text-amber-700",
    badge: "bg-amber-50 border-amber-200",
    ring: "hover:border-amber-400",
  },
  speaking: {
    accent: "text-rose-700",
    badge: "bg-rose-50 border-rose-200",
    ring: "hover:border-rose-400",
  },
}
const DEFAULT_COLOR = SECTION_COLOR.grammar

/** Render order: skip categories that have no exercises. */
const SECTION_ORDER: Category[] = ["grammar", "vocabulary", "listening", "speaking"]

interface Section {
  meta: SectionMeta
  category: Category
  tasks: { id: string; title: string }[]
}

function groupExercises(exercises: Exercise[]): Section[] {
  const byCategory: Record<Category, { id: string; title: string }[]> = {
    grammar: [],
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
      })
    }
  }
  return SECTION_ORDER.map((cat) => ({
    meta: SECTION_META[cat],
    category: cat,
    tasks: byCategory[cat],
  })).filter((s) => s.tasks.length > 0)
}

export default function SectionsPage() {
  const { grade } = useParams<{ grade: string }>()
  const router = useRouter()

  const [sections, setSections] = useState<Section[] | null>(null)
  const [error, setError] = useState(false)

  // Per-grade client-side progress (localStorage, no backend — decision Q8).
  const { progress, completedCount } = useProgress(grade)

  // Analytics: fire section_selected on mount to signal "user is browsing
  // sections for grade N" (the UI shows all sections at once, so the page
  // view itself is the selection point).
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
    return () => {
      cancelled = true
    }
  }, [grade])

  return (
    <div className="flex flex-col items-center px-4 py-12 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-indigo-900 mb-2">{grade} класс</h1>
      <p className="text-slate-500 mb-2">Выбери раздел</p>
      {sections && sections.length > 0 && (
        <div className="text-sm text-indigo-600 mb-6">
          Пройдено {completedCount} из{" "}
          {sections.reduce((sum, s) => sum + s.tasks.length, 0)}
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
          return (
          <div key={s.meta.sectionId} className="w-full mb-6">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: si * 0.1 }}
              className="flex items-center gap-3 mb-3"
            >
              <span className="text-2xl">{s.meta.icon}</span>
              <div>
                <div className={`font-bold ${color.accent}`}>{s.meta.title}</div>
                <div className="text-xs text-slate-500">{s.meta.desc}</div>
              </div>
            </motion.div>

            <div className="grid grid-cols-2 gap-2 ml-10">
              {s.tasks.map((t, ti) => (
                <motion.button
                  key={t.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: si * 0.1 + ti * 0.05 }}
                  onClick={() => {
                    track({
                      event_type: "task_started",
                      grade: Number(grade),
                      task_id: t.id,
                      section_id: s.meta.sectionId,
                    })
                    router.push(`/class/${grade}/sections/${s.meta.sectionId}/${t.id}`)
                  }}
                  className={`text-left px-3 py-2 rounded-xl border text-sm text-slate-700 hover:shadow-md transition-all ${color.badge} ${color.ring}`}
                >
                  <span>{t.title}</span>
                  {progress[t.id] && (
                    <span className="ml-1 text-xs text-emerald-600 font-semibold">
                      ✓ {progress[t.id].score}/{progress[t.id].total}
                    </span>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
          )
        })}
    </div>
  )
}
