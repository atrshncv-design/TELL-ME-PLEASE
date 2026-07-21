"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

const grades = [5, 6, 7, 8, 9]

const emojis: Record<number, string> = {
  5: "🌟",
  6: "🚀",
  7: "🎯",
  8: "⚡",
  9: "🔥",
}

export default function ClassPage() {
  const router = useRouter()

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <h1 className="text-3xl font-bold text-indigo-900 mb-8">Выбери свой класс</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg">
        {grades.map((g, i) => (
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
    </div>
  )
}
