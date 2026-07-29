"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useVerbBot } from "@/components/VerbBot"

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
  onComplete?: (score: number, total: number) => void
}

export function QuizTask({ title, description, items, onComplete }: QuizTaskProps) {
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [finished, setFinished] = useState(false)
  const { say } = useVerbBot()
  // Read-only review history, indexed by question number.
  const [history, setHistory] = useState<{ selected: string | null; showResult: boolean }[]>([])
  // True while the auto-advance timeout is pending — disables navigation.
  const [transitioning, setTransitioning] = useState(false)

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <p className="text-slate-500">Нет данных для отображения</p>
      </div>
    )
  }

  const item = items[current]
  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <p className="text-slate-500">Ошибка: задание пустое</p>
      </div>
    )
  }

  const display = item.question || item.sentence || item.subject || ""

  const handleSelect = (option: string) => {
    if (showResult) return
    setSelected(option)
    setShowResult(true)
    const correct = option === item.answer
    if (correct) setScore((s) => s + 1)
    say(correct ? "correct" : "wrong")

    // Persist this answer for read-only review.
    setHistory((prev) => {
      const next = [...prev]
      next[current] = { selected: option, showResult: true }
      return next
    })

    setTransitioning(true)
    setTimeout(() => {
      setTransitioning(false)
      if (current + 1 < items.length) {
        setCurrent((c) => c + 1)
        // Restore any previously-saved state for the next question, or reset.
        const nextEntry = history[current + 1]
        setSelected(nextEntry ? nextEntry.selected : null)
        setShowResult(nextEntry ? nextEntry.showResult : false)
      } else {
        setFinished(true)
        onComplete?.(correct ? score + 1 : score, items.length)
        say("finish")
      }
    }, 1200)
  }

  // Read-only navigation: jump to a question index and restore its saved state.
  const goTo = (index: number) => {
    if (transitioning) return
    setCurrent(index)
    const entry = history[index]
    setSelected(entry ? entry.selected : null)
    setShowResult(entry ? entry.showResult : false)
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

  const canGoBack = current > 0 && !transitioning
  // Forward is allowed when this question is answered and a later question exists.
  const canGoForward = showResult && current < items.length - 1 && !transitioning

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-indigo-900">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>

      <div className="flex items-center justify-between gap-2">
        {canGoBack ? (
          <button
            onClick={() => goTo(current - 1)}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← Назад
          </button>
        ) : (
          <span className="text-sm text-transparent select-none">← Назад</span>
        )}
        <div className="text-xs text-slate-400">
          Вопрос {current + 1} из {items.length}
        </div>
        {canGoForward ? (
          <button
            onClick={() => goTo(current + 1)}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Вперёд →
          </button>
        ) : (
          <span className="text-sm text-transparent select-none">Вперёд →</span>
        )}
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
              className={`rounded-xl px-4 py-4 min-h-[52px] font-semibold text-lg text-slate-800 transition-all ${bg}`}
            >
              {opt}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
