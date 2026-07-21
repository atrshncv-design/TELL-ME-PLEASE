"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface QuizItem {
  question?: string
  sentence?: string
  subject?: string
  options: string[]
  answer: string
}

interface QuizTaskProps {
  title: string
  description: string
  items: QuizItem[]
  onComplete?: (score: number) => void
}

export function QuizTask({ title, description, items, onComplete }: QuizTaskProps) {
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [finished, setFinished] = useState(false)

  const item = items[current]
  const display = item.question || item.sentence || item.subject || ""

  const handleSelect = (option: string) => {
    if (showResult) return
    setSelected(option)
    setShowResult(true)
    const correct = option === item.answer
    if (correct) setScore((s) => s + 1)

    setTimeout(() => {
      if (current + 1 < items.length) {
        setCurrent((c) => c + 1)
        setSelected(null)
        setShowResult(false)
      } else {
        setFinished(true)
        onComplete?.(correct ? score + 1 : score)
      }
    }, 1200)
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center gap-4 p-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-5xl">
          {score === items.length ? "🏆" : score >= items.length * 0.7 ? "🎉" : "💪"}
        </motion.div>
        <h2 className="text-2xl font-bold text-indigo-900">{title}</h2>
        <p className="text-lg text-slate-600">
          Результат: {score} / {items.length}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-indigo-900">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>

      <div className="text-xs text-slate-400">
        Вопрос {current + 1} из {items.length}
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <motion.div
          className="bg-indigo-500 h-2 rounded-full"
          animate={{ width: `${((current + 1) / items.length) * 100}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -30, opacity: 0 }}
          className="text-center py-6"
        >
          <p className="text-2xl font-semibold text-slate-800">{display}</p>
        </motion.div>
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-3">
        {item.options.map((opt) => {
          const isCorrect = opt === item.answer
          const isSelected = opt === selected
          let bg = "bg-white border-2 border-indigo-200 hover:border-indigo-400"
          if (showResult && isCorrect) bg = "bg-green-100 border-2 border-green-500"
          else if (showResult && isSelected && !isCorrect) bg = "bg-red-100 border-2 border-red-500"

          return (
            <motion.button
              key={opt}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelect(opt)}
              disabled={showResult}
              className={`rounded-xl px-4 py-3 font-medium text-slate-800 transition-all ${bg}`}
            >
              {opt}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
