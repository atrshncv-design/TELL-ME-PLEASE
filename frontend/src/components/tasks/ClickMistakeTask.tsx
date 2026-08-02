"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useVerbBot } from "@/components/VerbBot"
import { useSound } from "@/lib/useSound"
import { ResultScreen } from "@/components/ResultScreen"

/** Одно предложение: текст + слово с ошибкой (null = «ловушка», ошибки нет). */
interface ClickMistakeItem {
  text: string
  wrong: string | null
}

interface ClickMistakeTaskProps {
  title: string
  description: string
  items: ClickMistakeItem[]
  onComplete?: (score: number, total: number) => void
}

/** Сколько неудачных кликов на предложение — и показываем правильный ответ. */
const MAX_ATTEMPTS = 2

/** Задержка перед авто-переходом после правильного ответа (мс). */
const ADVANCE_DELAY = 950

/**
 * Убирает пунктуацию с краёв слова, чтобы сравнить его с `wrong`
 * (в контенте пунктуация приклеена к словам: "student.", "Is", "isn't").
 */
function normalizeWord(word: string): string {
  return word.replace(/^[^\p{L}\p{N}'-]+|[^\p{L}\p{N}'-]+$/gu, "").toLowerCase()
}

/** Разбивает предложение на слова (знаки препинания остаются приклеенными). */
function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(Boolean)
}

/** Фаза ответа на текущее предложение. */
type Phase = "idle" | "correct" | "revealed"

export function ClickMistakeTask({ title, description, items, onComplete }: ClickMistakeTaskProps) {
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [phase, setPhase] = useState<Phase>("idle")
  const [shaken, setShaken] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
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
  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <p className="text-slate-500">Ошибка: задание пустое</p>
      </div>
    )
  }

  const words = tokenize(item.text)
  const isTrap = item.wrong === null
  const wrongIndex = isTrap ? -1 : words.findIndex((w) => normalizeWord(w) === normalizeWord(item.wrong!))

  /** Переход дальше (или финал) с актуальным счётом. */
  const advance = (finalScore: number) => {
    setTransitioning(false)
    setShaken(null)
    setAttempts(0)
    setPhase("idle")
    if (current + 1 < items.length) {
      setCurrent((c) => c + 1)
    } else {
      setFinished(true)
      onComplete?.(finalScore, items.length)
      play("fanfare")
      say("finish")
    }
  }

  /** Клик по слову в предложении. */
  const handleWordClick = (word: string) => {
    if (phase !== "idle" || transitioning) return

    // Ловушка: ошибки нет — любой клик по слову считается ошибкой.
    if (isTrap) {
      setShaken(word)
      const nextAttempts = attempts + 1
      setAttempts(nextAttempts)
      play("wrong")
      say("wrong")
      if (nextAttempts >= MAX_ATTEMPTS) setPhase("revealed")
      return
    }

    if (normalizeWord(word) === normalizeWord(item.wrong!)) {
      // Правильный клик по неверному слову.
      const nextScore = attempts === 0 ? score + 1 : score
      if (attempts === 0) setScore(nextScore)
      setPhase("correct")
      play("correct")
      say("correct")
      setTransitioning(true)
      setTimeout(() => advance(nextScore), ADVANCE_DELAY)
    } else {
      // Неверный клик — shake, попытка учтена.
      setShaken(word)
      const nextAttempts = attempts + 1
      setAttempts(nextAttempts)
      play("wrong")
      say("wrong")
      if (nextAttempts >= MAX_ATTEMPTS) setPhase("revealed")
    }
  }

  /** Кнопка «Всё верно!» — правильный ответ для ловушки. */
  const handleAllCorrect = () => {
    if (phase !== "idle" || transitioning || !isTrap) return
    const nextScore = attempts === 0 ? score + 1 : score
    if (attempts === 0) setScore(nextScore)
    setPhase("correct")
    play("correct")
    say("correct")
    setTransitioning(true)
    setTimeout(() => advance(nextScore), ADVANCE_DELAY)
  }

  /** Кнопка «Дальше» после показа правильного ответа (2 неудачные попытки). */
  const handleNextAfterReveal = () => {
    if (phase !== "revealed" || transitioning) return
    advance(score)
  }

  const retry = () => {
    setCurrent(0)
    setScore(0)
    setAttempts(0)
    setPhase("idle")
    setShaken(null)
    setFinished(false)
    setTransitioning(false)
  }

  if (finished) {
    return <ResultScreen title={title} score={score} total={items.length} onRetry={retry} />
  }

  const attemptsLeft = Math.max(0, MAX_ATTEMPTS - attempts)

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-primary-900">
        {title}
      </h2>
      <p className="text-sm text-slate-500">{description}</p>

      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-slate-400">
          Предложение {current + 1} из {items.length}
        </div>
        <div className="text-xs font-semibold text-slate-400">
          Попыток осталось: {attemptsLeft}
        </div>
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
          className="py-6"
        >
          {/* Слова-чипы */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {words.map((word, wi) => {
              const isWrongWord = wi === wrongIndex
              let chip = "bg-white border-2 border-primary-200 hover:border-primary-400"
              if (phase === "correct" && isWrongWord) {
                chip = "bg-success/10 border-2 border-success"
              } else if (phase === "revealed" && isWrongWord) {
                chip = "bg-success/10 border-2 border-success"
              }

              return (
                <motion.button
                  key={`${current}-${wi}`}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleWordClick(word)}
                  disabled={phase !== "idle"}
                  animate={
                    phase === "correct" && isWrongWord
                      ? { scale: [1, 1.18, 1] }
                      : phase === "idle" && shaken === word
                        ? { x: [0, -9, 9, -6, 6, 0] }
                        : {}
                  }
                  transition={
                    phase === "correct" && isWrongWord
                      ? { duration: 0.5, ease: "easeOut" }
                      : phase === "idle" && shaken === word
                        ? { duration: 0.45 }
                        : {}
                  }
                  className={`min-h-[44px] rounded-2xl px-3.5 py-2 text-lg font-bold leading-snug text-slate-800 transition-colors ${chip}`}
                >
                  {word}
                  {phase === "correct" && isWrongWord && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                      className="ml-1.5 inline-block text-xl text-success"
                    >
                      ✓
                    </motion.span>
                  )}
                </motion.button>
              )
            })}
          </div>

          {/* Кнопка для ловушки: «Всё верно!» */}
          {isTrap && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <p className="text-sm text-slate-500">
                В этом предложении ошибки нет — нажми кнопку!
              </p>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={handleAllCorrect}
                disabled={phase !== "idle"}
                animate={
                  phase === "correct"
                    ? { scale: [1, 1.08, 1] }
                    : phase === "revealed"
                      ? { scale: [1, 1.08, 1] }
                      : {}
                }
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`min-h-[48px] rounded-2xl px-6 py-3 font-bold transition-colors ${
                  phase === "correct" || phase === "revealed"
                    ? "bg-success/10 border-2 border-success text-success"
                    : "bg-primary-600 text-white shadow-glow-primary hover:bg-primary-700"
                }`}
              >
                ✅ Всё верно!
              </motion.button>
            </div>
          )}

          {/* Баннеры обратной связи */}
          <AnimatePresence>
            {phase === "correct" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-success/10 px-4 py-3 text-base font-bold text-success"
              >
                {isTrap ? "Ошибки нет — всё верно! 🎉" : "Верно! Ты нашёл ошибку! 🎉"}
              </motion.div>
            )}
            {phase === "revealed" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-5 flex flex-col items-center gap-3 rounded-2xl bg-listening-100/70 px-4 py-3"
              >
                <p className="text-center text-base font-bold text-slate-700">
                  {isTrap
                    ? "В этом предложении ошибки нет! ✅"
                    : `Правильный ответ: «${item.wrong}»`}
                </p>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={handleNextAfterReveal}
                  className="min-h-[44px] rounded-2xl bg-primary-600 px-6 py-2.5 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
                >
                  Дальше →
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
