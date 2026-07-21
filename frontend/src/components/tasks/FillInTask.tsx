"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface FillItem {
  sentence: string
  answer: string
  hint?: string
}

interface FillInTaskProps {
  title: string
  description: string
  items: FillItem[]
  onComplete?: (score: number) => void
}

export function FillInTask({ title, description, items, onComplete }: FillInTaskProps) {
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [input, setInput] = useState("")
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [finished, setFinished] = useState(false)

  const item = items[current]

  const handleSubmit = () => {
    const correct = input.trim().toLowerCase() === item.answer.toLowerCase()
    setIsCorrect(correct)
    if (correct) setScore((s) => s + 1)
    setShowResult(true)

    setTimeout(() => {
      if (current + 1 < items.length) {
        setCurrent((c) => c + 1)
        setInput("")
        setShowResult(false)
      } else {
        setFinished(true)
      }
    }, 1500)
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

  const parts = item.sentence.split("___")

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-indigo-900">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>

      <div className="text-xs text-slate-400">
        Предложение {current + 1} из {items.length}
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
          className="text-center py-4"
        >
          <p className="text-lg text-slate-800">
            {parts[0]}
            <span className="inline-block min-w-[80px] border-b-2 border-indigo-400 mx-1 text-indigo-600 font-semibold">
              {showResult ? item.answer : " ? "}
            </span>
            {parts[1] || ""}
          </p>
          {item.hint && <p className="text-xs text-slate-400 mt-2">{item.hint}</p>}
        </motion.div>
      </AnimatePresence>

      {!showResult ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Впиши ответ..."
            className="flex-1 px-4 py-2 rounded-xl border-2 border-indigo-200 focus:border-indigo-500 outline-none text-center"
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700"
          >
            OK
          </motion.button>
        </div>
      ) : (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className={`text-center py-3 rounded-xl text-lg font-semibold ${
            isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {isCorrect ? "Правильно! ✅" : `Неверно. Ответ: ${item.answer}`}
        </motion.div>
      )}
    </div>
  )
}
