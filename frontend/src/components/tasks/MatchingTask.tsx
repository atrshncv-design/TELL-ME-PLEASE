"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useVerbBot } from "@/components/VerbBot"
import { useSound } from "@/lib/useSound"
import { ResultScreen } from "@/components/ResultScreen"
import { StickerReaction } from "@/components/StickerReaction"
import type { MatchingItem } from "@/types/task"

interface MatchingTaskProps {
  title: string
  description: string
  items: MatchingItem[]
  /** Все профессии станции — легенда-подсказка над списком (необязательно). */
  columns?: string[]
  onComplete?: (score: number, total: number) => void
}

/**
 * Matching (тикет T05, станция B1.2 «Анализ Профилей») — «Угадай профессию».
 *
 * Для КАЖДОГО описания повседневных дел (Present Simple) ученик выбирает
 * профессию из вариантов (options). Паттерн QuizTask: «выбрал → Проверить →
 * вердикт → Далее» — клик по чипу только подсвечивает выбор (его можно менять
 * до «Проверить»), после вердикта ответы read-only. По одному item'у за раз,
 * review-навигация (← Назад / Вперёд → / goTo) сохраняется.
 * Счёт = верные сопоставления / items.length; onComplete(score, total) — один
 * раз на финише (ResultScreen). Валюта ⚡ Energy: тип НЕ в SPEAKING_TASK_TYPES
 * (useProgress.ts не трогаем — taskType="matching" даёт дефолтный бейдж «+N ⚡»).
 */
export function MatchingTask({ title, description, items, columns, onComplete }: MatchingTaskProps) {
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [finished, setFinished] = useState(false)
  const { say } = useVerbBot()
  const { play } = useSound()
  // Read-only review history, indexed by item number (как в QuizTask).
  const [history, setHistory] = useState<{ selected: string | null; showResult: boolean }[]>([])
  // Стикер-реакция на последний ответ. Ключ = номер item'а, чтобы
  // AnimatePresence перезапускал анимацию на каждом ответе.
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

  // Клик по чипу профессии только ВЫБИРАЕТ ответ — проверка отложена до
  // кнопки «Проверить». Повторный клик по другому чипу меняет выбор.
  const handleSelect = (option: string) => {
    if (showResult) return
    setSelected(option)
  }

  // «Проверить»: вердикт (подсветка правильного/неправильного), звук, say,
  // стикер-реакция; ответ сохраняется в историю для read-only review.
  const handleCheck = () => {
    if (showResult || selected === null) return
    const correct = selected === item.answer
    if (correct) setScore((s) => s + 1)
    say(correct ? "correct" : "wrong")
    play(correct ? "correct" : "wrong")
    setReaction({ key: current, correct })

    setHistory((prev) => {
      const next = [...prev]
      next[current] = { selected, showResult: true }
      return next
    })
    setShowResult(true)
  }

  // «Далее»: переход к следующему описанию без авто-таймера (или ResultScreen
  // в конце — onComplete(score, total) вызывается ровно один раз).
  const advance = () => {
    setReaction(null)
    if (current + 1 < items.length) {
      const nextIndex = current + 1
      setCurrent(nextIndex)
      // Restore any previously-saved state for the next item, or reset.
      const nextEntry = history[nextIndex]
      setSelected(nextEntry ? nextEntry.selected : null)
      setShowResult(nextEntry ? nextEntry.showResult : false)
    } else {
      setFinished(true)
      onComplete?.(score, items.length)
      say("finish")
      play("fanfare")
    }
  }

  // Read-only navigation: jump to an item index and restore its saved state.
  const goTo = (index: number) => {
    setCurrent(index)
    setReaction(null)
    const entry = history[index]
    setSelected(entry ? entry.selected : null)
    setShowResult(entry ? entry.showResult : false)
  }

  const retry = () => {
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
      <ResultScreen title={title} score={score} total={items.length} onRetry={retry} taskType="matching" />
    )
  }

  const canGoBack = current > 0
  // Forward is allowed when this item is checked and a later item exists.
  const canGoForward = showResult && current < items.length - 1

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-primary-900">
        {title}
      </h2>
      <p className="text-sm text-slate-500">{description}</p>

      {/* Легенда: все профессии станции (из columns, если заданы). */}
      {columns && columns.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {columns.map((c) => (
            <span
              key={c}
              className="rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700"
            >
              {c}
            </span>
          ))}
        </div>
      )}

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
          Профиль {current + 1} из {items.length}
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
          className="rounded-2xl bg-white px-4 py-5 text-center shadow-soft"
        >
          <p className="text-xl font-semibold leading-snug text-slate-800">{item.text}</p>
        </motion.div>
      </AnimatePresence>

      <p className="text-sm font-semibold text-slate-500">Кто это?</p>

      <div className="relative grid grid-cols-2 gap-3">
        {/* Стикер-реакция на последний ответ — по центру поверх чипов,
            улетает и тает (~1.3с). Правило «один на экран». */}
        <AnimatePresence>
          {reaction && reaction.key === current && (
            <StickerReaction
              key={reaction.key}
              id={reaction.correct ? "fire" : "oops"}
              text={reaction.correct ? "+1 ⚡" : undefined}
              className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            />
          )}
        </AnimatePresence>
        {item.options.map((opt) => {
          const isCorrect = opt === item.answer
          const isSelected = opt === selected
          let bg = "bg-white border-2 border-primary-200 hover:border-primary-400"
          if (showResult && isCorrect) {
            bg = "bg-success/10 border-2 border-success"
          } else if (showResult && isSelected && !isCorrect) {
            bg = "bg-danger/10 border-2 border-danger"
          } else if (!showResult && isSelected) {
            // Выбранный чип подсвечивается до нажатия «Проверить».
            bg = "bg-primary-100 border-2 border-primary-600"
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
              className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl px-3 py-3 text-base font-bold text-slate-800 transition-colors ${bg}`}
            >
              {opt}
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

      {/* CTA: «Проверить» (только когда профессия выбрана) → после вердикта «Далее». */}
      <div className="mt-1">
        {!showResult ? (
          selected !== null && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleCheck}
              className="w-full min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
            >
              Проверить
            </motion.button>
          )
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={advance}
            className="w-full min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
          >
            Далее
          </motion.button>
        )}
      </div>
    </div>
  )
}
