"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useVerbBot } from "@/components/VerbBot"
import { useSound } from "@/lib/useSound"
import { ResultScreen } from "@/components/ResultScreen"
import { StickerReaction } from "@/components/StickerReaction"
import { hintFor } from "@/lib/hints"

/**
 * BuildChatTask — «Build a Chat» (тикет W2-T3, тип build-chat).
 *
 * Механика: чат с пропусками + неожиданное событие.
 *  1) Сообщения из JSON `chat` ({from: "A"|"B", text с одним "_"}): ученик
 *     выбирает подходящую форму из options под сообщением (выбрал → можно
 *     поменять → «Проверить» → вердикт + подсказка → «Далее»).
 *  2) После всех пропусков — неожиданное событие (event: {title, text,
 *     replies[]}): ученик продолжает переписку и выбирает 2-3 реплики-ответа
 *     (коммуникативный выбор — верный = логичный, не грамматический).
 *  3) Финальный вердикт → «Далее» → ResultScreen.
 *
 * Счёт: +1 за каждую верную форму и +1 за каждую верную реплику; total =
 * chat.length + replies.length. Весь тип build-chat речевой (🗣) — добавлен
 * в SPEAKING_TASK_TYPES (useProgress), ResultScreen получает taskType.
 */

interface ChatMessage {
  from: "A" | "B"
  /** Текст сообщения ровно с одним пропуском "_". */
  text: string
  options: string[]
  answer: string
  wrongExplanation?: string
}

interface ChatReply {
  /** Необязательная реплика друга, на которую отвечает ученик. */
  prompt?: string
  options: string[]
  answer: string
  wrongExplanation?: string
}

interface ChatEvent {
  title: string
  text: string
  replies: ChatReply[]
}

interface BuildChatTaskProps {
  title: string
  description: string
  chat: ChatMessage[]
  event?: ChatEvent | null
  onComplete?: (score: number, total: number) => void
}

type Step =
  | { kind: "chat"; index: number }
  | { kind: "event" }
  | { kind: "reply"; index: number }

const LETTERS = ["A", "B", "C", "D", "E", "F"]

export function BuildChatTask({ title, description, chat, event, onComplete }: BuildChatTaskProps) {
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [finished, setFinished] = useState(false)
  // Read-only review history, indexed by step number.
  const [history, setHistory] = useState<{ selected: string | null; showResult: boolean }[]>([])
  // Стикер-реакция на последний ответ. Ключ = номер шага, чтобы AnimatePresence
  // перезапускал анимацию на каждом ответе.
  const [reaction, setReaction] = useState<{ key: number; correct: boolean } | null>(null)
  const { say } = useVerbBot()
  const { play } = useSound()

  if (!chat || chat.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <p className="text-slate-500">Нет данных для отображения</p>
      </div>
    )
  }

  const replies = event?.replies ?? []
  const hasEvent = !!event && replies.length > 0
  // Единый список шагов: сообщения с пропусками → событие → реплики-ответы.
  const steps: Step[] = [
    ...chat.map((_, i) => ({ kind: "chat", index: i }) as Step),
    ...(hasEvent
      ? ([{ kind: "event" } as Step, ...replies.map((_, i) => ({ kind: "reply", index: i }) as Step)])
      : []),
  ]
  const total = chat.length + (hasEvent ? replies.length : 0)
  const step = steps[current]
  const isLast = current === steps.length - 1

  const message = step?.kind === "chat" ? chat[step.index] : null
  const reply = step?.kind === "reply" ? replies[step.index] : null
  const answer = message?.answer ?? reply?.answer ?? null

  // Клик по варианту только ВЫБИРАЕТ ответ — проверка отложена до «Проверить».
  const handleSelect = (option: string) => {
    if (showResult) return
    setSelected(option)
  }

  // «Проверить»: вердикт (подсветка правильного/неправильного), звук, say,
  // стикер-реакция; ответ сохраняется в историю для read-only review.
  const handleCheck = () => {
    if (showResult || selected === null || answer === null) return
    const correct = selected === answer
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

  // Восстановить состояние шага (для навигации вперёд/назад). Событие —
  // шаг-открытие: проверки нет, поэтому showResult сразу true.
  const restoreStep = (index: number) => {
    if (steps[index]?.kind === "event") {
      setSelected(null)
      setShowResult(true)
      setHistory((prev) => {
        const next = [...prev]
        next[index] = { selected: null, showResult: true }
        return next
      })
      return
    }
    const entry = history[index]
    setSelected(entry ? entry.selected : null)
    setShowResult(entry ? entry.showResult : false)
  }

  // «Далее»: переход к следующему шагу (или ResultScreen в конце —
  // onComplete(score, total) вызывается ровно один раз).
  const advance = () => {
    setReaction(null)
    if (!isLast) {
      const nextIndex = current + 1
      setCurrent(nextIndex)
      restoreStep(nextIndex)
    } else {
      setFinished(true)
      onComplete?.(score, total)
      say("finish")
      play("fanfare")
    }
  }

  const goTo = (index: number) => {
    setCurrent(index)
    setReaction(null)
    restoreStep(index)
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
      <ResultScreen title={title} score={score} total={total} taskType="build-chat" onRetry={retry} />
    )
  }

  const canGoBack = current > 0
  // Вперёд разрешён, когда шаг проверен (событие «проверено» всегда).
  const canGoForward = showResult && !isLast

  // Подсказка при неверном ответе (hintFor: wrongExplanation из JSON или
  // фолбэк; сам hints.ts не меняем — сигнатура hintFor(task, item, answer)).
  const wrongHint =
    showResult && selected !== null && answer !== null && selected !== answer
      ? hintFor("build-chat", (message ?? reply) ?? undefined, selected)
      : null

  const stepLabel =
    step?.kind === "chat"
      ? `Сообщение ${step.index + 1} из ${chat.length}`
      : step?.kind === "reply"
        ? `Реплика ${step.index + 1} из ${replies.length}`
        : "Неожиданное событие"

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
        <div className="text-xs font-semibold text-slate-400">{stepLabel}</div>
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
          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-speaking-400"
          animate={{ width: `${((current + 1) / steps.length) * 100}%` }}
          transition={{ type: "spring", stiffness: 150, damping: 22 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -30, opacity: 0 }}
          className="flex flex-col gap-3 py-2"
        >
          {step?.kind === "chat" && message && (
            <>
              <Bubble from={message.from}>
                {renderGapText(message.text, {
                  selected,
                  showResult,
                  answer: message.answer,
                })}
              </Bubble>

              <div className="relative grid grid-cols-2 gap-3">
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
                {message.options.map((opt, oi) => {
                  const isCorrect = opt === message.answer
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
            </>
          )}

          {step?.kind === "event" && event && (
            <>
              <div className="rounded-2xl border-2 border-speaking-200 bg-speaking-50 p-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-speaking-700">
                  <span aria-hidden="true">🎯</span> Неожиданное событие!
                </div>
                <p className="mt-2 text-xl font-extrabold text-slate-800">{event.title}</p>
                <p className="mt-1 text-base font-semibold leading-snug text-slate-600">
                  {event.text}
                </p>
              </div>
              <Bubble from="B">{event.text}</Bubble>
            </>
          )}

          {step?.kind === "reply" && reply && (
            <>
              {reply.prompt && <Bubble from="B">{reply.prompt}</Bubble>}
              <div className="text-center text-xs font-bold uppercase tracking-wide text-slate-400">
                Твоя реплика
              </div>

              <div className="relative grid grid-cols-1 gap-3">
                <AnimatePresence>
                  {reaction && reaction.key === current && (
                    <StickerReaction
                      key={reaction.key}
                      id={reaction.correct ? "fire" : "oops"}
                      text={reaction.correct ? "+1 🗣" : undefined}
                      className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    />
                  )}
                </AnimatePresence>
                {reply.options.map((opt, oi) => {
                  const isCorrect = opt === reply.answer
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
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Подсказка при неверном ответе (danger-soft, как в QuizTask). */}
      <AnimatePresence>
        {wrongHint && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-1 rounded-2xl bg-danger/10 px-4 py-3 text-center text-base font-semibold text-danger"
          >
            💡 {wrongHint}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA: «Проверить» (только когда вариант выбран) → после вердикта «Далее». */}
      <div className="mt-1">
        {step?.kind === "event" || showResult ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={advance}
            className="w-full min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
          >
            {isLast ? "Завершить" : "Далее"}
          </motion.button>
        ) : (
          selected !== null && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleCheck}
              className="w-full min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
            >
              Проверить
            </motion.button>
          )
        )}
      </div>
    </div>
  )
}

/** Реплика чата: аватар (A — ученик, B — друг) + пузырь сообщения. */
function Bubble({ from, children }: { from: "A" | "B"; children: ReactNode }) {
  const isMe = from === "A"
  return (
    <div className={`flex items-end gap-2 ${isMe ? "justify-end flex-row-reverse" : "justify-start"}`}>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${
          isMe ? "bg-primary-600" : "bg-speaking-500"
        }`}
      >
        {from}
      </span>
      <div
        className={`max-w-[80%] rounded-2xl border-2 px-4 py-2.5 text-base font-semibold leading-snug ${
          isMe
            ? "rounded-br-md border-primary-200 bg-primary-50 text-primary-900"
            : "rounded-bl-md border-slate-200 bg-white text-slate-800"
        }`}
      >
        {children}
      </div>
    </div>
  )
}

/** Текст сообщения с ровно одним пропуском "_": сегменты + слот-пропуск. */
function renderGapText(
  text: string,
  state: { selected: string | null; showResult: boolean; answer: string },
): ReactNode {
  const parts = text.split("_")
  const slot = renderGapSlot(state)
  return (
    <>
      {parts[0]}
      {slot}
      {parts.slice(1).join("_")}
    </>
  )
}

/** Слот-пропуск: пустой / выбранный / верный (зелёный) / неверный (красный). */
function renderGapSlot(state: {
  selected: string | null
  showResult: boolean
  answer: string
}): ReactNode {
  const { selected, showResult, answer } = state
  let label = selected ?? "…"
  let cls = "border-dashed border-primary-300 text-primary-300"
  if (showResult && selected !== null && selected !== answer) {
    // Показываем выбор ученика → верный ответ (как в ClozeTextTask).
    label = `${selected} → ${answer}`
    cls = "border-danger bg-danger/10 text-danger"
  } else if (showResult && selected === answer) {
    cls = "border-success bg-success/10 text-success"
  } else if (selected !== null) {
    cls = "border-primary-500 bg-primary-100 text-primary-800"
  }
  return (
    <span
      className={`mx-0.5 inline-flex min-w-[64px] items-center justify-center rounded-lg border-2 px-1.5 py-0.5 text-center font-black ${cls}`}
    >
      {label}
    </span>
  )
}
