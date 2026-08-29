"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useVerbBot } from "@/components/VerbBot"
import { useSound } from "@/lib/useSound"
import { ResultScreen } from "@/components/ResultScreen"
import { StickerReaction } from "@/components/StickerReaction"
import { hintFor } from "@/lib/hints"
import { hashString, seededShuffle } from "@/lib/shuffle"
import {
  advanceDelayMs,
  CALM_ANSWER_LINE_CLASS,
  CORRECT_ANSWER_PREFIX,
  optionVerdictStyle,
} from "./verdict"

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
  // pravki-240826 (тикет 04): полное правильное предложение — показывается
  // после ответа («чтобы ученик сам себя смог проверить», Финальный Босс).
  // Если поле есть — авто-переход 900 мс заменяется баннером + кнопкой «Далее».
  answerSentence?: string
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
  // вердикт (✓/✗ подсветка + звук + say + стикер-реакция) и авто-переход к
  // следующему вопросу: ~900 мс при верном ответе, ~1.8 c при неверном
  // (тикет 03, pravki-150826 — время разглядеть красный вердикт). Кнопки
  // «Проверить»/«Далее» для quiz убраны; review-навигация (история, ←/→,
  // goTo) остаётся READ-ONLY.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  // Очистка таймера авто-перехода при размонтировании (уход со страницы).
  useEffect(() => clearTimer, [])

  /** Переход к следующему вопросу (или финал) — общий для авто-перехода и
   *  кнопки «Далее» в reveal-режиме (тикет 04, pravki-240826). */
  const advance = (finalScore: number) => {
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
      onComplete?.(finalScore, items.length)
      say("finish")
      play("fanfare")
    }
  }

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
    setSelected(option)
    setShowResult(true)

    // pravki-240826 (тикет 04): у item с answerSentence авто-перехода нет —
    // ученик читает правильное предложение и жмёт «Далее» (advance).
    if (item.answerSentence) return

    // Авто-переход: вердикт виден ~900 мс (верно) или ~1.8 c (неверно —
    // тикет 03), затем следующий вопрос (или ResultScreen в конце —
    // onComplete(score, total) вызывается ровно один раз).
    timerRef.current = setTimeout(() => advance(nextScore), advanceDelayMs(correct))
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
  // R12: стрелки работают без засчитывания — листание свободно, onComplete только по «Проверить»/авто-переходу
  const canGoForward = current < items.length - 1
  // R03: формы глагола (past-simple A1) показываются после проверки
  // при любом ответе — отдельной плашкой, а не только как wrongHint.
  const hasVerbForms = typeof item.explanation === "string" && item.explanation.trim() !== ""
  // Тикет W1-T3: умная обратная связь — подсказка под вердиктом неверного
  // ответа (wrongExplanation из JSON или фолбэк по типу задания).
  // Для станций с verbForms подсказка уже покрыта плашкой форм — не дублируем.
  const wrongHint =
    showResult && selected !== null && selected !== item.answer && !hasVerbForms
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
          // Тикет 03 (pravki-150826): единый хелпер вердикта. Неверный выбор —
          // сильный красный (сплошная заливка danger + крупный ✗); награда
          // (пульсация + ✓) только на своём верном выборе; правильный вариант
          // при ошибке — спокойная подсветка без анимаций.
          const v = optionVerdictStyle({
            checked: showResult,
            isCorrect,
            isSelected,
            answeredCorrectly: selected === item.answer,
          })

          return (
            <motion.button
              key={opt}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelect(opt)}
              disabled={showResult}
              animate={
                v.celebrate
                  ? { scale: [1, 1.07, 1] }
                  : v.shake
                    ? { x: [0, -8, 8, -5, 5, 0] }
                    : {}
              }
              transition={
                v.celebrate
                  ? { duration: 0.5, ease: "easeOut" }
                  : v.shake
                    ? { duration: 0.45 }
                    : {}
              }
              className={`flex min-h-[56px] items-center gap-2.5 rounded-2xl px-3 py-3 text-left transition-colors ${v.box}`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${v.chip}`}
              >
                {LETTERS[oi] ?? oi + 1}
              </span>
              <span className={`flex-1 text-lg font-bold leading-snug ${v.label}`}>
                {opt}
              </span>
              {v.mark && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  className={v.markWrapClass}
                >
                  <span className={v.markClass}>{v.mark}</span>
                </motion.span>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Тикет 03: при неверном ответе правильный вариант показывается
          спокойной строкой БЕЗ праздничной пульсации и зелёной галочки. */}
      <AnimatePresence>
        {showResult && selected !== null && selected !== item.answer && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={CALM_ANSWER_LINE_CLASS}
          >
            {CORRECT_ANSWER_PREFIX}{" "}
            <span className="font-bold">{item.answer}</span>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* R03 (yolypaly-final 02): после проверки показываем V1/V2/V3×перевод
          выбранного глагола — отдельной плашкой, при верном и неверном ответе. */}
      <AnimatePresence>
        {showResult && hasVerbForms && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 rounded-2xl bg-primary-50 border-2 border-primary-200 px-4 py-3 text-center"
          >
            <div className="text-[11px] font-bold uppercase tracking-wide text-primary-600">
              Формы глагола
            </div>
            <p className="mt-1 text-base font-semibold text-slate-700">
              {item.explanation}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* pravki-240826 (тикет 04): reveal-режим — у item есть answerSentence.
          После ответа показываем полное правильное предложение (самопроверка,
          запрос клиентки для «Финального Босса») и кнопку «Далее» вместо
          авто-перехода. */}
      <AnimatePresence>
        {showResult && item.answerSentence && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 flex flex-col gap-3"
          >
            <div
              className={`rounded-2xl px-4 py-3 text-center ${
                selected === item.answer
                  ? "bg-success/10 border-2 border-success"
                  : "bg-primary-50 border-2 border-primary-200"
              }`}
            >
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Правильное предложение
              </div>
              <p className="mt-1 font-display text-lg font-extrabold leading-snug text-slate-800">
                {item.answerSentence}
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => advance(score)}
              className="min-h-[44px] rounded-2xl bg-primary-600 px-6 py-2.5 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
            >
              {current + 1 < items.length ? "Далее →" : "Завершить →"}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Мгновенная проверка (Q5): кнопок «Проверить»/«Далее» у quiz больше нет —
          клик по варианту сразу даёт вердикт и авто-переход (верно ~900 мс,
          неверно ~1.8 c — тикет 03). Исключение — reveal-режим выше
          (answerSentence): там «Далее» явная. */}
    </div>
  )
}
