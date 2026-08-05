"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useVerbBot } from "@/components/VerbBot"
import { useSound } from "@/lib/useSound"
import { ResultScreen } from "@/components/ResultScreen"
import { hintFor } from "@/lib/hints"

interface FillItem {
  sentence: string
  answer: string | string[]
  hint?: string
  // Тикет W1-T3: умная обратная связь — необязательные подсказки из JSON.
  wrongExplanation?: string
  explanation?: string
}

interface FillInTaskProps {
  title: string
  description: string
  items: FillItem[]
  onComplete?: (score: number, total: number) => void
}

export function FillInTask({ title, description, items, onComplete }: FillInTaskProps) {
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [inputs, setInputs] = useState<string[]>([""])
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [finished, setFinished] = useState(false)
  // Read-only review history, indexed by question number.
  const [history, setHistory] = useState<
    { inputs: string[]; showResult: boolean; isCorrect: boolean }[]
  >([])
  const { say } = useVerbBot()
  const { play } = useSound()

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <p className="text-slate-500">Нет данных для отображения</p>
      </div>
    )
  }

  const item = items[current]
  if (!item || !item.sentence) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <p className="text-slate-500">Ошибка: задание пустое</p>
      </div>
    )
  }

  const parts = item.sentence.split("___")
  const answers = Array.isArray(item.answer) ? item.answer : [item.answer]
  const blankCount = parts.length - 1
  // «Проверить» доступно, когда заполнены все пропуски.
  const allFilled =
    blankCount === 0 ||
    Array.from({ length: blankCount }, (_, i) => (inputs[i] ?? "").trim()).every(
      Boolean
    )

  // Вердикт по конкретному пропуску: зелёный (верно) или красный (неверно).
  const blankCorrect = (i: number) =>
    (inputs[i] ?? "").trim().toLowerCase() === (answers[i] ?? "").toLowerCase()

  const updateInput = (index: number, value: string) => {
    if (showResult) return
    setInputs((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  // «Проверить»: вердикт (зелёные/красные пропуски), звук, say; ответ
  // сохраняется в историю для read-only review. Авто-перехода больше нет —
  // дальше ученик идёт кнопкой «Далее».
  const handleCheck = () => {
    if (showResult) return
    const correct = answers.every(
      (ans, i) => (inputs[i] ?? "").trim().toLowerCase() === ans.toLowerCase()
    )
    setIsCorrect(correct)
    if (correct) setScore((s) => s + 1)
    setShowResult(true)
    say(correct ? "correct" : "wrong")
    play(correct ? "correct" : "wrong")

    // Persist this answer for read-only review.
    setHistory((prev) => {
      const next = [...prev]
      next[current] = { inputs: [...inputs], showResult: true, isCorrect: correct }
      return next
    })
  }

  // «Далее»: переход к следующему предложению без авто-таймера (или
  // ResultScreen в конце — onComplete(score, total) вызывается ровно один раз).
  const advance = () => {
    if (current + 1 < items.length) {
      const nextIndex = current + 1
      setCurrent(nextIndex)
      // Restore any previously-saved state for the next question, or reset.
      const nextEntry = history[nextIndex]
      if (nextEntry) {
        setInputs(nextEntry.inputs)
        setShowResult(nextEntry.showResult)
        setIsCorrect(nextEntry.isCorrect)
      } else {
        const nextItem = items[nextIndex]
        const nextBlanks = nextItem
          ? Math.max(nextItem.sentence.split("___").length - 1, 1)
          : 1
        setInputs(Array.from({ length: nextBlanks }, () => ""))
        setShowResult(false)
        setIsCorrect(false)
      }
    } else {
      setFinished(true)
      onComplete?.(score, items.length)
      say("finish")
      play("fanfare")
    }
  }

  // Read-only navigation: jump to a question index and restore its saved state.
  const goTo = (index: number) => {
    setCurrent(index)
    const entry = history[index]
    if (entry) {
      setInputs(entry.inputs)
      setShowResult(entry.showResult)
      setIsCorrect(entry.isCorrect)
    } else {
      // Should not happen (we only navigate to answered questions), but be safe.
      const it = items[index]
      const blanks = it ? Math.max(it.sentence.split("___").length - 1, 1) : 1
      setInputs(Array.from({ length: blanks }, () => ""))
      setShowResult(false)
      setIsCorrect(false)
    }
  }

  const retry = () => {
    const firstItem = items[0]
    const firstBlanks = firstItem
      ? Math.max(firstItem.sentence.split("___").length - 1, 1)
      : 1
    setCurrent(0)
    setScore(0)
    setInputs(Array.from({ length: firstBlanks }, () => ""))
    setShowResult(false)
    setIsCorrect(false)
    setFinished(false)
    setHistory([])
  }

  if (finished) {
    return <ResultScreen title={title} score={score} total={items.length} onRetry={retry} />
  }

  const canGoBack = current > 0
  // Forward is allowed when this question is checked and a later question exists.
  const canGoForward = showResult && current < items.length - 1

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-indigo-900">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>

      <div className="flex items-center justify-between gap-2">
        {canGoBack ? (
          <button
            onClick={() => goTo(current - 1)}
            className="min-h-[44px] text-sm text-slate-500 hover:text-slate-700"
          >
            ← Назад
          </button>
        ) : (
          <span className="text-sm text-transparent select-none">← Назад</span>
        )}
        <div className="text-xs text-slate-400">
          Предложение {current + 1} из {items.length}
        </div>
        {canGoForward ? (
          <button
            onClick={() => goTo(current + 1)}
            className="min-h-[44px] text-sm text-slate-500 hover:text-slate-700"
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
          className="text-center py-4"
        >
          <p className="text-lg text-slate-800">
            {parts.map((part, i) => (
              <span key={i}>
                {part}
                {i < blankCount && (
                  <span
                    className={`inline-block min-w-[80px] border-b-2 mx-1 font-semibold rounded px-1 ${
                      showResult
                        ? blankCorrect(i)
                          ? "border-success bg-success/10 text-success"
                          : "border-danger bg-danger/10 text-danger"
                        : "border-indigo-400 text-indigo-600"
                    }`}
                  >
                    {showResult ? (answers[i] ?? "?") : " ? "}
                  </span>
                )}
              </span>
            ))}
          </p>
          {item.hint && <p className="text-xs text-slate-400 mt-2">{item.hint}</p>}
        </motion.div>
      </AnimatePresence>

      {!showResult ? (
        <div className="flex flex-col gap-2">
          {answers.map((_, i) => (
            <input
              key={i}
              type="text"
              value={inputs[i] ?? ""}
              onChange={(e) => updateInput(i, e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                i === blankCount - 1 &&
                allFilled &&
                handleCheck()
              }
              placeholder={`Пропуск ${i + 1}...`}
              className="flex-1 px-4 py-3 text-lg rounded-xl border-2 border-indigo-200 focus:border-indigo-500 outline-none text-center min-h-[52px]"
              autoFocus={i === 0}
            />
          ))}
          {/* CTA: «Проверить» (только когда все пропуски заполнены) → после
              вердикта «Далее». */}
          {allFilled && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleCheck}
              className="w-full min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
            >
              Проверить
            </motion.button>
          )}
        </div>
      ) : (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className={`text-center py-3 rounded-xl text-lg font-semibold ${
            isCorrect ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
          }`}
        >
          <div>
            {isCorrect
              ? "Правильно!"
              : `Неверно. Ответ: ${answers.join(" / ")}`}
          </div>
          {/* Тикет W1-T3: умная обратная связь — подсказка под вердиктом. */}
          {!isCorrect && (
            <div className="mt-1 text-sm font-medium text-danger/90">
              💡 {hintFor("fill-in", item, inputs)}
            </div>
          )}
        </motion.div>
      )}

      {showResult && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={advance}
          className="w-full min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
        >
          Далее
        </motion.button>
      )}
    </div>
  )
}
