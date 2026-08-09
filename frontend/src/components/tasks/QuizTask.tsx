"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useVerbBot } from "@/components/VerbBot"
import { useSound } from "@/lib/useSound"
import { ResultScreen } from "@/components/ResultScreen"
import { StickerReaction } from "@/components/StickerReaction"
import { hintFor } from "@/lib/hints"
import { hashString, seededShuffle } from "@/lib/shuffle"

interface QuizItem {
  question?: string
  sentence?: string
  subject?: string
  options: string[]
  answer: string
  // Тикет W1-T3: умная обратная связь — необязательные подсказки из JSON.
  wrongExplanation?: string
  explanation?: string
  hint?: string
}

interface QuizTaskProps {
  title: string
  description: string
  items: QuizItem[]
  onComplete?: (score: number, total: number) => void
}

const LETTERS = ["A", "B", "C", "D", "E", "F"]

export function QuizTask({ title, description, items, onComplete }: QuizTaskProps) {
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [finished, setFinished] = useState(false)
  const { say } = useVerbBot()
  const { play } = useSound()
  // Read-only review history, indexed by question number.
  const [history, setHistory] = useState<{ selected: string | null; showResult: boolean }[]>([])
  // Тикет 05: стикер-реакция на последний ответ (+XP-вспышка). Ключ = номер
  // вопроса, чтобы AnimatePresence перезапускал анимацию на каждом ответе.
  const [reaction, setReaction] = useState<{ key: number; correct: boolean } | null>(null)

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

  // G1 (клиентские правки 08.08.2026): детерминированный шаффл вариантов.
  // Seed = заголовок + номер вопроса + текст вопроса → для одного вопроса
  // порядок всегда одинаковый (SSR = клиент, без hydration mismatch), а
  // между вопросами позиция правильного ответа меняется («не всегда первый»).
  // Проверка по значению (option === item.answer) — шаффл на неё не влияет.
  const options = seededShuffle(
    item.options,
    hashString(`${title}|${current}|${display}`)
  )

  // Мгновенная проверка (Q5, пакет «Все Эпохи»): клик по варианту СРАЗУ даёт
  // вердикт (✓/✗ подсветка + звук + say + стикер-реакция) и через ~900 мс
  // авто-переход к следующему вопросу. Кнопки «Проверить»/«Далее» для quiz
  // убраны; review-навигация (история, ←/→, goTo) остаётся READ-ONLY.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  // Очистка таймера авто-перехода при размонтировании (уход со страницы).
  useEffect(() => clearTimer, [])

  const handleSelect = (option: string) => {
    if (showResult || finished) return
    clearTimer()
    const correct = option === item.answer
    const nextScore = score + (correct ? 1 : 0)
    setScore(nextScore)
    say(correct ? "correct" : "wrong")
    play(correct ? "correct" : "wrong")
    // Стикер-реакция на ответ (+XP-вспышка). Ключ = номер вопроса, чтобы
    // AnimatePresence перезапускал анимацию на каждом ответе.
    setReaction({ key: current, correct })

    // Persist this answer for read-only review.
    setHistory((prev) => {
      const next = [...prev]
      next[current] = { selected: option, showResult: true }
      return next
    })
    setShowResult(true)

    // Авто-переход: вердикт виден ~900 мс, затем следующий вопрос (или
    // ResultScreen в конце — onComplete(score, total) вызывается ровно один раз).
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      if (current + 1 < items.length) {
        const nextIndex = current + 1
        setCurrent(nextIndex)
        // Restore any previously-saved state for the next question, or reset.
        const nextEntry = history[nextIndex]
        setSelected(nextEntry ? nextEntry.selected : null)
        setShowResult(nextEntry ? nextEntry.showResult : false)
      } else {
        setFinished(true)
        onComplete?.(nextScore, items.length)
        say("finish")
        play("fanfare")
      }
    }, 900)
  }

  // Read-only navigation: jump to a question index and restore its saved state.
  const goTo = (index: number) => {
    clearTimer()
    setCurrent(index)
    setReaction(null)
    const entry = history[index]
    setSelected(entry ? entry.selected : null)
    setShowResult(entry ? entry.showResult : false)
  }

  const retry = () => {
    clearTimer()
    setCurrent(0)
    setScore(0)
    setSelected(null)
    setShowResult(false)
    setFinished(false)
    setHistory([])
    setReaction(null)
  }

  if (finished) {
    return (
      <ResultScreen title={title} score={score} total={items.length} onRetry={retry} />
    )
  }

  const canGoBack = current > 0
  // Forward is allowed when this question is checked and a later question exists.
  const canGoForward = showResult && current < items.length - 1
  // Тикет W1-T3: умная обратная связь — подсказка под вердиктом неверного
  // ответа (wrongExplanation из JSON или фолбэк по типу задания).
  const wrongHint =
    showResult && selected !== null && selected !== item.answer
      ? hintFor("quiz", item, selected)
      : null

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-primary-900">
        {title}
      </h2>
      <p className="text-sm text-slate-500">{description}</p>

      <div className="flex items-center justify-between gap-2">
        {canGoBack ? (
          <button
            onClick={() => goTo(current - 1)}
            className="min-h-[44px] text-sm font-semibold text-slate-500 hover:text-slate-700"
          >
            ← Назад
          </button>
        ) : (
          <span className="text-sm text-transparent select-none">← Назад</span>
        )}
        <div className="text-xs font-semibold text-slate-400">
          Вопрос {current + 1} из {items.length}
        </div>
        {canGoForward ? (
          <button
            onClick={() => goTo(current + 1)}
            className="min-h-[44px] text-sm font-semibold text-slate-500 hover:text-slate-700"
          >
            Вперёд →
          </button>
        ) : (
          <span className="text-sm text-transparent select-none">Вперёд →</span>
        )}
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-grammar-400"
          animate={{ width: `${((current + 1) / items.length) * 100}%` }}
          transition={{ type: "spring", stiffness: 150, damping: 22 }}
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

      <div className="relative grid grid-cols-2 gap-3">
        {/* Тикет 05: стикер-реакция на последний ответ — по центру поверх
            кнопок, улетает и тает (~1.3с). Правило «один на экран»: рендерится
            только сразу после «Проверить» на текущем вопросе. */}
        <AnimatePresence>
          {reaction && reaction.key === current && (
            <StickerReaction
              key={reaction.key}
              id={reaction.correct ? "fire" : "oops"}
              text={reaction.correct ? "+1 ⭐" : undefined}
              className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            />
          )}
        </AnimatePresence>
        {options.map((opt, oi) => {
          const isCorrect = opt === item.answer
          const isSelected = opt === selected
          let bg = "bg-white border-2 border-primary-200 hover:border-primary-400"
          let chip = "bg-primary-100 text-primary-700"
          if (showResult && isCorrect) {
            bg = "bg-success/10 border-2 border-success"
            chip = "bg-success text-white"
          } else if (showResult && isSelected && !isCorrect) {
            bg = "bg-danger/10 border-2 border-danger"
            chip = "bg-danger text-white"
          } else if (!showResult && isSelected) {
            // Выбранный вариант подсвечивается до нажатия «Проверить».
            bg = "bg-primary-100 border-2 border-primary-600"
            chip = "bg-primary-600 text-white"
          }

          return (
            <motion.button
              key={opt}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelect(opt)}
              disabled={showResult}
              animate={
                showResult && isCorrect
                  ? { scale: [1, 1.07, 1] }
                  : showResult && isSelected && !isCorrect
                    ? { x: [0, -8, 8, -5, 5, 0] }
                    : {}
              }
              transition={
                showResult && isCorrect
                  ? { duration: 0.5, ease: "easeOut" }
                  : showResult && isSelected && !isCorrect
                    ? { duration: 0.45 }
                    : {}
              }
              className={`flex min-h-[56px] items-center gap-2.5 rounded-2xl px-3 py-3 text-left transition-colors ${bg}`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${chip}`}
              >
                {LETTERS[oi] ?? oi + 1}
              </span>
              <span className="flex-1 text-lg font-bold leading-snug text-slate-800">
                {opt}
              </span>
              {showResult && isCorrect && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  className="text-xl text-success"
                >
                  ✓
                </motion.span>
              )}
              {showResult && isSelected && !isCorrect && (
                <span className="text-xl text-danger">✗</span>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Тикет W1-T3: подсказка под вердиктом неверного ответа (danger-soft). */}
      <AnimatePresence>
        {wrongHint && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 rounded-2xl bg-danger/10 px-4 py-3 text-center text-base font-semibold text-danger"
          >
            💡 {wrongHint}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Мгновенная проверка (Q5): кнопок «Проверить»/«Далее» у quiz больше нет —
          клик по варианту сразу даёт вердикт и авто-переход через ~900 мс. */}
    </div>
  )
}
