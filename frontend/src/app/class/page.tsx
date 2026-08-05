"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useAnalytics } from "@/lib/useAnalytics"

const CANDIDATE_GRADES = [5, 6, 7, 8, 9]

const emojis: Record<number, string> = {
  5: "🌟",
  6: "🚀",
  7: "🎯",
  8: "⚡",
  9: "🔥",
}

/**
 * Per-grade card colors — cycle the 5 world accents (Bright Kids Palette,
 * DESIGN.md): primary → tobe → vocabulary → listening → speaking.
 * All class names are string literals so Tailwind can see them.
 * `glow` = colored drop shadow (design/opendesign token).
 */
const gradeStyles: Record<number, { card: string; text: string; glow: string }> = {
  5: {
    card: "bg-gradient-to-br from-primary-100/80 via-primary-50/60 to-white border-primary-200",
    text: "text-primary-800",
    glow: "hover:shadow-glow-primary",
  },
  6: {
    card: "bg-gradient-to-br from-tobe-100/80 via-tobe-50/60 to-white border-tobe-200",
    text: "text-tobe-800",
    glow: "hover:shadow-glow-tobe",
  },
  7: {
    card: "bg-gradient-to-br from-vocabulary-100/80 via-vocabulary-50/60 to-white border-vocabulary-200",
    text: "text-vocabulary-800",
    glow: "hover:shadow-glow-vocabulary",
  },
  8: {
    card: "bg-gradient-to-br from-listening-100/80 via-listening-50/60 to-white border-listening-200",
    text: "text-listening-800",
    glow: "hover:shadow-glow-listening",
  },
  9: {
    card: "bg-gradient-to-br from-speaking-100/80 via-speaking-50/60 to-white border-speaking-200",
    text: "text-speaking-800",
    glow: "hover:shadow-glow-speaking",
  },
}
const DEFAULT_GRADE_STYLE = gradeStyles[5]

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const cardAnim = {
  hidden: { y: 24, opacity: 0, scale: 0.9 },
  visible: { y: 0, opacity: 1, scale: 1 },
}

export default function ClassPage() {
  const router = useRouter()
  const { track } = useAnalytics()
  const [available, setAvailable] = useState<number[] | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const results = await Promise.all(
        CANDIDATE_GRADES.map(async (g) => {
          try {
            const r = await fetch(`/content/tasks/grade_${g}/index.json`)
            if (!r.ok) return null
            const data = await r.json()
            return Array.isArray(data.exercises) && data.exercises.length > 0
              ? g
              : null
          } catch {
            return null
          }
        })
      )
      if (!cancelled)
        setAvailable(results.filter((g): g is number => g !== null))
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-1 flex-col px-4 py-12">
      {/* Кнопка «← Назад» — на лендинг (стиль TaskHeader). */}
      <button
        onClick={() => router.push("/")}
        className="mb-6 flex min-h-[44px] min-w-[44px] items-center justify-center self-start rounded-2xl bg-primary-100 px-3 py-2 text-base font-bold text-primary-700 transition-colors hover:bg-primary-200"
      >
        ← Назад
      </button>
      <div className="flex flex-1 flex-col items-center justify-center">
      <h1 className="font-display mb-2 text-3xl font-extrabold tracking-tight text-primary-900">
        Выбери свой класс
      </h1>
      <p className="mb-8 text-sm font-medium text-slate-500">
        Нажми на свой класс и отправляйся в путешествие по мирам
      </p>
      {available === null ? (
        <p className="text-lg text-primary-700">Загрузка...</p>
      ) : available.length === 0 ? (
        <p className="text-lg text-primary-700">Задания скоро появятся</p>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="grid max-w-lg grid-cols-2 gap-4 sm:grid-cols-3"
        >
          {available.map((g) => {
            const style = gradeStyles[g] ?? DEFAULT_GRADE_STYLE
            return (
              <motion.button
                key={g}
                variants={cardAnim}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.93 }}
                transition={{ type: "spring", stiffness: 380, damping: 22 }}
                onClick={() => {
                  track({ event_type: "grade_selected", grade: g })
                  router.push(`/class/${g}/sections`)
                }}
                className={`flex flex-col items-center gap-2 rounded-3xl border p-6 shadow-soft transition-shadow ${style.card} ${style.glow}`}
              >
                <span className="text-5xl drop-shadow-sm">{emojis[g]}</span>
                <span className={`font-display text-2xl font-extrabold ${style.text}`}>
                  {g} класс
                </span>
              </motion.button>
            )
          })}
        </motion.div>
      )}
      </div>
    </div>
  )
}
