"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

const CANDIDATE_GRADES = [5, 6, 7, 8, 9]

const emojis: Record<number, string> = {
  5: "🌟",
  6: "🚀",
  7: "🎯",
  8: "⚡",
  9: "🔥",
}

export default function ClassPage() {
  const router = useRouter()
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
      <h1 className="text-3xl font-bold text-indigo-900 mb-8">Выбери свой класс</h1>
      {available === null ? (
        <p className="text-lg text-indigo-700">Загрузка...</p>
      ) : available.length === 0 ? (
        <p className="text-lg text-indigo-700">Задания скоро появятся</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg">
          {available.map((g, i) => (
            <motion.button
              key={g}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => router.push(`/class/${g}/sections`)}
              className="flex flex-col items-center gap-2 rounded-2xl bg-white p-6 shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95 border border-indigo-100"
            >
              <span className="text-4xl">{emojis[g]}</span>
              <span className="text-xl font-bold text-indigo-800">{g} класс</span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}
