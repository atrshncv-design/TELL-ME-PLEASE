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
 */
const gradeStyles: Record<number, { card: string; text: string }> = {
  5: {
    card: "bg-gradient-to-br from-primary-100/80 via-primary-50/60 to-white border-primary-200 hover:shadow-primary-100",
    text: "text-primary-800",
  },
  6: {
    card: "bg-gradient-to-br from-tobe-100/80 via-tobe-50/60 to-white border-tobe-200 hover:shadow-tobe-100",
    text: "text-tobe-800",
  },
  7: {
    card: "bg-gradient-to-br from-vocabulary-100/80 via-vocabulary-50/60 to-white border-vocabulary-200 hover:shadow-vocabulary-100",
    text: "text-vocabulary-800",
  },
  8: {
    card: "bg-gradient-to-br from-listening-100/80 via-listening-50/60 to-white border-listening-200 hover:shadow-listening-100",
    text: "text-listening-800",
  },
  9: {
    card: "bg-gradient-to-br from-speaking-100/80 via-speaking-50/60 to-white border-speaking-200 hover:shadow-speaking-100",
    text: "text-speaking-800",
  },
}
const DEFAULT_GRADE_STYLE = gradeStyles[5]

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
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <h1 className="text-3xl font-bold text-primary-900 mb-8">Выбери свой класс</h1>
      {available === null ? (
        <p className="text-lg text-primary-700">Загрузка...</p>
      ) : available.length === 0 ? (
        <p className="text-lg text-primary-700">Задания скоро появятся</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg">
          {available.map((g, i) => {
            const style = gradeStyles[g] ?? DEFAULT_GRADE_STYLE
            return (
              <motion.button
                key={g}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => {
                  track({ event_type: "grade_selected", grade: g })
                  router.push(`/class/${g}/sections`)
                }}
                className={`flex flex-col items-center gap-2 rounded-2xl p-6 shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95 border ${style.card}`}
              >
                <span className="text-4xl drop-shadow-sm">{emojis[g]}</span>
                <span className={`text-xl font-bold ${style.text}`}>{g} класс</span>
              </motion.button>
            )
          })}
        </div>
      )}
    </div>
  )
}
