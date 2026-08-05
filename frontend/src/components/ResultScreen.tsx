"use client"

import { motion } from "framer-motion"
import { Confetti } from "./Confetti"
import { SPEAKING_TASK_TYPES } from "@/lib/useProgress"

/**
 * Shared result screen (design/opendesign) — the emotional peak of a task.
 * Perfect run → confetti + trophy; ≥70% → 🎉; otherwise a friendly 💪.
 * Score is rendered as a big display number with an animated fill bar;
 * optional retry button resets the task in place.
 * W1-T1: строка «+N ⚡» / «+N 🗣» — валюта зависит от типа задания:
 * голосовые (voice-chat / role-play / fill-in-and-speak) дают 🗣
 * Communication, остальные — ⚡ Energy. Без taskType → ⚡ (дефолт).
 */
interface ResultScreenProps {
  title: string
  score: number
  total: number
  onRetry?: () => void
  /** Тип задания (TaskData.type) — определяет валюту награды (W1-T1). */
  taskType?: string
}

export function ResultScreen({ title, score, total, onRetry, taskType }: ResultScreenProps) {
  const pct = total > 0 ? score / total : 0
  const perfect = pct === 1
  const good = pct >= 0.7

  const emoji = perfect ? "🏆" : good ? "🎉" : "💪"
  const headline = perfect ? "Идеально!" : good ? "Отлично!" : "Хорошая попытка!"
  const sub = perfect
    ? "Без единой ошибки — ты супер!"
    : good
      ? "Почти идеально. Так держать!"
      : "Повтори задание — и получится ещё лучше!"

  // W1-T1: валюта награды. Голосовые типы → 🗣, остальные (и дефолт) → ⚡.
  const isComm = taskType ? SPEAKING_TASK_TYPES.includes(taskType) : false

  return (
    <div className="relative flex flex-col items-center gap-3 overflow-hidden px-6 py-8">
      {perfect && <Confetti count={30} />}

      <motion.div
        initial={{ scale: 0, rotate: -25 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 14 }}
        className="text-6xl drop-shadow-md"
      >
        {emoji}
      </motion.div>

      <h2 className="font-display text-3xl font-extrabold text-primary-900">{headline}</h2>
      <p className="text-sm text-slate-500">{sub}</p>

      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.15 }}
        className="mt-1 flex items-baseline gap-2"
      >
        <span className="font-display text-6xl font-black text-primary-800">{score}</span>
        <span className="text-2xl font-bold text-slate-400">/ {total}</span>
      </motion.div>

      <div className="mt-1 h-3 w-full max-w-[240px] overflow-hidden rounded-full bg-slate-100">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.2 }}
          className={`h-full rounded-full ${perfect ? "bg-gradient-to-r from-listening-400 to-speaking-400" : good ? "bg-vocabulary-500" : "bg-primary-400"}`}
        />
      </div>

      {/* W1-T1: награда за задание — «+N ⚡» (Energy) или «+N 🗣» (Comm)
          для голосовых типов. Цвета — токены светлой темы. */}
      <div
        className={`mt-1 flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold shadow-soft ${
          isComm
            ? "border-speaking-200 bg-speaking-100 text-speaking-800"
            : "border-listening-200 bg-listening-100 text-listening-800"
        }`}
      >
        <span>+{score}</span>
        <span aria-hidden="true">{isComm ? "🗣" : "⚡"}</span>
      </div>

      <p className="text-xs text-slate-400">{title}</p>

      {onRetry && (
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={onRetry}
          className="mt-2 min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
        >
          ↻ Ещё раз
        </motion.button>
      )}
    </div>
  )
}
