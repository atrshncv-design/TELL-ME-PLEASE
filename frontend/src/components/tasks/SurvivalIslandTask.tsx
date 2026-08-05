"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useVerbBot } from "@/components/VerbBot"
import { useSound } from "@/lib/useSound"
import { ResultScreen } from "@/components/ResultScreen"
import { StickerReaction } from "@/components/StickerReaction"
import { useSpeechRecognition } from "@/lib/useSpeechRecognition"
import type { SurvivalIslandStep } from "@/types/task"
import type { OneMinuteCondition } from "@/types/task"

/**
 * Survival Island (тикет W2-T2) — новый тип задания "survival-island".
 *
 * Сюжет: «Ты и твоя команда — на острове. Составь план выживания!» —
 * ОДИНОЧНАЯ адаптация: ученик говорит ОТ ЛИЦА КОМАНДЫ
 * (We have a tent. / We are looking for water. / We found some food. /
 *  We will build a fire. / We must stay together.).
 *
 * 5 категорий-реплик из JSON steps[] (key: have|doing|found|will|must,
 * labelRu, example, markers[]). Ученик ПО ОЧЕРЕДИ произносит каждую
 * (push-to-talk через useSpeechRecognition, как в OneMinuteTask; текстовый
 * фолбэк). Авто-оценка: в реплике категории встретилось >= min маркеров
 * (эвристика \b-целых слов, маркеры из JSON) — 1 балл за категорию.
 * Опоры: scaffold=full (5–6 кл.) — шаблон «We have ___» + словарик;
 * scaffold=keywords/conditions (8–9 кл.) — условные образцы
 * («If it rains, we will stay in the tent», поле condition) + опциональные
 * бонус-условия conditions[] (как в one-minute, считаются дополнительными
 * баллами). «Проверить» → вердикт N из M → «Далее» → ResultScreen.
 * Начисление: onComplete(score, total) → saveTask с типом "survival-island"
 * (в SPEAKING_TASK_TYPES → награда 🗣 Communication).
 */

interface SurvivalIslandTaskProps {
  title: string
  description: string
  scaffold?: "full" | "keywords" | "conditions"
  steps: SurvivalIslandStep[]
  /** Бонус-условия для 8–9 кл. (один-в-один форма one-minute conditions). */
  conditions?: OneMinuteCondition[]
  onComplete?: (score: number, total: number) => void
}

type Phase = "ready" | "speaking" | "checking" | "verdict" | "finished"

/** Экранирование regex-спецсимволов (маркеры ищем как целые слова). */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Эвристика: сколько маркеров встретилось в тексте (как в one-minute). */
function markersMet(markers: string[] | undefined, text: string): number {
  if (!markers || markers.length === 0) return 0
  const lower = text.toLowerCase()
  let count = 0
  for (const marker of markers) {
    const norm = marker.trim().toLowerCase()
    if (!norm) continue
    try {
      if (new RegExp(`\\b${escapeRegex(norm)}\\b`, "i").test(lower)) count++
    } catch {
      /* пропускаем невалидный маркер */
    }
  }
  return count
}

/** Выполнена ли категория-реплика: >= min маркеров в её тексте. */
function stepMet(step: SurvivalIslandStep, text: string): boolean {
  return markersMet(step.markers, text) >= (step.min ?? 1)
}

export function SurvivalIslandTask({
  title,
  description,
  scaffold = "full",
  steps,
  conditions,
  onComplete,
}: SurvivalIslandTaskProps) {
  const { say } = useVerbBot()
  const { play } = useSound()
  const [phase, setPhase] = useState<Phase>("ready")
  const [stepIndex, setStepIndex] = useState(0)
  const [stepTexts, setStepTexts] = useState<string[]>([])
  const [textInput, setTextInput] = useState("")
  const [reaction, setReaction] = useState<{ key: number; correct: boolean } | null>(null)

  const total = steps.length + (conditions?.length || 0)

  // Категории засчитаны по своим репликам; бонус-условия — по всему тексту.
  const allText = useMemo(() => stepTexts.join(" "), [stepTexts])
  const score = useMemo(() => {
    let s = 0
    steps.forEach((step, i) => {
      if (stepMet(step, stepTexts[i] || "")) s++
    })
    ;(conditions || []).forEach((c) => {
      if (markersMet(c.markers, allText) >= (c.min ?? 1)) s++
    })
    return s
  }, [steps, conditions, stepTexts, allText])

  const step = steps[stepIndex] ?? null
  const isLastStep = stepIndex >= steps.length - 1

  // Push-to-talk (как в OneMinuteTask): реплика добавляется к ТЕКУЩЕЙ категории.
  const { listening, supported, error, start, stop } = useSpeechRecognition({
    onResult: (text) => {
      if (phase !== "speaking") return
      setStepTexts((prev) => {
        const next = [...prev]
        next[stepIndex] = next[stepIndex] ? `${next[stepIndex]} ${text}` : text
        return next
      })
    },
  })

  const appendText = (text: string) => {
    setStepTexts((prev) => {
      const next = [...prev]
      next[stepIndex] = next[stepIndex] ? `${next[stepIndex]} ${text}` : text
      return next
    })
  }

  const handleStart = () => {
    stop()
    setStepIndex(0)
    setStepTexts([])
    setTextInput("")
    setReaction(null)
    setPhase("speaking")
  }

  const toggleMic = () => {
    if (phase !== "speaking") return
    if (listening) stop()
    else start()
  }

  const handleAddText = () => {
    const t = textInput.trim()
    if (!t || phase !== "speaking") return
    appendText(t)
    setTextInput("")
  }

  // «Далее»: следующая категория; после последней — экран проверки.
  const handleNextStep = () => {
    if (phase !== "speaking") return
    stop()
    if (isLastStep) setPhase("checking")
    else setStepIndex((i) => i + 1)
  }

  // «←»: вернуться к предыдущей категории (текст реплики сохраняется).
  const handlePrevStep = () => {
    if (phase !== "speaking" || stepIndex === 0) return
    stop()
    setStepIndex((i) => i - 1)
  }

  // «Проверить»: вердикт (N из M), звук, say, стикер.
  const handleCheck = () => {
    if (phase !== "checking") return
    stop()
    const correct = score >= Math.ceil(total / 2)
    setReaction({ key: 1, correct })
    say(correct ? "correct" : "wrong")
    play(correct ? "correct" : "wrong")
    setPhase("verdict")
  }

  // «Далее» после вердикта → ResultScreen; onComplete ровно один раз.
  const handleNext = () => {
    if (phase !== "verdict") return
    setPhase("finished")
    onComplete?.(score, total)
    say("finish")
    play("fanfare")
  }

  const retry = () => {
    stop()
    setPhase("ready")
    setStepIndex(0)
    setStepTexts([])
    setTextInput("")
    setReaction(null)
  }

  if (phase === "finished") {
    return (
      <ResultScreen title={title} score={score} total={total} onRetry={retry} taskType="survival-island" />
    )
  }

  if (!steps || steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <p className="text-slate-500">Нет данных для отображения</p>
      </div>
    )
  }

  const verdictGood = score >= Math.ceil(total / 2)

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-primary-900">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>

      {/* Сюжет: команда на острове */}
      <div className="flex items-center gap-2.5 rounded-2xl border-2 border-speaking-200 bg-speaking-100/60 px-4 py-3">
        <span className="text-xl" aria-hidden>
          🏝️
        </span>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-speaking-600">Миссия</div>
          <div className="font-display text-base font-extrabold text-primary-900">
            Ты и твоя команда — на острове. Говори от лица команды!
          </div>
        </div>
      </div>

      {/* Прогресс по категориям (кружки 1..N, зелёные — уже засчитанные) */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((s, i) => {
          const met = stepMet(s, stepTexts[i] || "")
          const current = phase === "speaking" && i === stepIndex
          return (
            <button
              key={s.key || i}
              onClick={current && i !== stepIndex ? undefined : phase === "speaking" ? () => { setStepIndex(i) } : undefined}
              disabled={phase !== "speaking"}
              aria-label={`Категория ${i + 1}: ${s.labelRu}`}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black transition-colors ${
                met
                  ? "bg-success text-white"
                  : current
                    ? "bg-primary-600 text-white ring-4 ring-primary-200"
                    : "bg-slate-200 text-slate-500"
              }`}
            >
              {met ? "✓" : i + 1}
            </button>
          )
        })}
      </div>

      {/* Карточка текущей категории */}
      {phase === "speaking" && step && (
        <motion.div
          key={step.key}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="rounded-2xl bg-white border-2 border-primary-100 p-5 shadow-soft"
        >
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-[11px] font-bold text-primary-700">
              Шаг {stepIndex + 1} из {steps.length}
            </span>
            <span className="text-xs text-slate-400">{step.labelRu}</span>
          </div>

          {/* Пример реплики */}
          <div className="mt-3 rounded-xl bg-primary-50 px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-primary-500">Скажи</div>
            <div className="font-display text-xl font-extrabold text-primary-900">{step.example}</div>
          </div>

          {/* Опоры: шаблон + словарик (scaffold=full, 5–6 кл.) */}
          {scaffold === "full" && step.template && (
            <div className="mt-3 rounded-xl border-2 border-dashed border-primary-200 px-4 py-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">По шаблону</div>
              <div className="font-display text-lg font-bold text-primary-800">{step.template}</div>
            </div>
          )}
          {scaffold === "full" && step.wordHint && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
              <span aria-hidden>💡</span>
              <span>{step.wordHint}</span>
            </div>
          )}

          {/* Опора для 8–9 кл.: условное предложение-образец */}
          {scaffold !== "full" && step.condition && (
            <div className="mt-3 rounded-xl border-2 border-dashed border-speaking-200 bg-speaking-50 px-4 py-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wide text-speaking-600">Условие-образец</div>
              <div className="font-display text-base font-bold text-speaking-800">{step.condition}</div>
            </div>
          )}

          {/* Транскрипт текущей реплики */}
          <div className="mt-3 rounded-xl border-2 border-dashed border-primary-200 bg-slate-50 p-3">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Твоя реплика</div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {stepTexts[stepIndex] || "Нажми на микрофон и произнеси реплику от лица команды!"}
            </p>
          </div>

          {/* Речь (push-to-talk) или текстовый фолбэк */}
          <div className="mt-4 flex flex-col items-center gap-3">
            {supported ? (
              <>
                <div className="relative">
                  {listening && (
                    <motion.span
                      className="absolute inset-0 rounded-full border-2 border-danger/50"
                      animate={{ scale: [1, 1.45], opacity: [0.8, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleMic}
                    title={listening ? "Остановить запись" : "Нажми, чтобы говорить"}
                    aria-label={listening ? "Остановить запись" : "Говорить"}
                    className={`flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-colors ${
                      listening ? "bg-danger text-white" : "bg-primary-600 text-white hover:bg-primary-700"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="9" y="2" width="6" height="12" rx="3" />
                      <path d="M5 10.5v.5a7 7 0 0 0 14 0v-.5" />
                      <line x1="12" y1="18" x2="12" y2="22" />
                    </svg>
                  </motion.button>
                </div>
                <div className="text-xs text-slate-500 min-h-[16px]">
                  {listening ? "Слушаю… говори!" : "Нажми, чтобы говорить (push-to-talk)"}
                </div>
              </>
            ) : (
              <div className="flex w-full flex-col gap-2">
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
                  🎤 Голосовая запись доступна в Chrome или Edge. Можно написать реплику текстом:
                </div>
                <div className="flex w-full gap-2">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddText()}
                    placeholder="We have a tent..."
                    className="min-h-[48px] flex-1 rounded-xl border-2 border-primary-200 px-4 py-3 text-base outline-none focus:border-primary-500"
                  />
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAddText}
                    disabled={!textInput.trim()}
                    className="rounded-xl bg-primary-600 px-5 py-3 font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Добавить
                  </motion.button>
                </div>
              </div>
            )}
            {error && <p className="text-center text-xs text-danger">{error}</p>}
          </div>

          {/* Навигация по шагам */}
          <div className="mt-4 flex gap-2">
            {stepIndex > 0 && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handlePrevStep}
                className="min-h-[44px] rounded-2xl border-2 border-primary-200 bg-white px-4 py-2.5 font-bold text-primary-700 transition-colors hover:bg-primary-50"
              >
                ← Назад
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleNextStep}
              className="min-h-[44px] flex-1 rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
            >
              {isLastStep ? "Готово 🏝️" : "Далее →"}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Экран проверки: все категории + бонус-условия + «Проверить» */}
      {phase === "checking" && (
        <div className="rounded-2xl bg-white border-2 border-primary-100 p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-extrabold text-primary-900">🏝️ План выживания</h3>
            <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-bold text-primary-700">
              {score} из {total}
            </span>
          </div>
          <ul className="mt-3 space-y-2">
            {steps.map((s, i) => {
              const met = stepMet(s, stepTexts[i] || "")
              return (
                <li
                  key={s.key || i}
                  className={`flex items-start gap-2.5 rounded-2xl border-2 px-3 py-2.5 ${
                    met ? "border-success/50 bg-success/5" : "border-danger/40 bg-danger/5"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                      met ? "bg-success text-white" : "bg-danger text-white"
                    }`}
                  >
                    {met ? "✓" : "✗"}
                  </span>
                  <div className="flex-1">
                    <div className={`text-sm font-bold ${met ? "text-success" : "text-slate-600"}`}>{s.labelRu}</div>
                    <div className="text-xs text-slate-400 italic">{s.example}</div>
                    {!met && stepTexts[i] && <div className="mt-0.5 text-xs text-danger/80">«{stepTexts[i]}» — не хватает маркеров</div>}
                    {!met && !stepTexts[i] && <div className="mt-0.5 text-xs text-danger/80">Реплика не записана</div>}
                  </div>
                </li>
              )
            })}
            {(conditions || []).map((c, i) => {
              const met = markersMet(c.markers, allText) >= (c.min ?? 1)
              return (
                <li
                  key={`cond-${i}`}
                  className={`flex items-start gap-2.5 rounded-2xl border-2 px-3 py-2.5 ${
                    met ? "border-success/50 bg-success/5" : "border-danger/40 bg-danger/5"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                      met ? "bg-success text-white" : "bg-danger text-white"
                    }`}
                  >
                    {met ? "✓" : "✗"}
                  </span>
                  <div className="flex-1">
                    <div className={`text-sm font-bold ${met ? "text-success" : "text-slate-600"}`}>{c.label}</div>
                    <div className="text-xs text-slate-400">{c.hint}</div>
                  </div>
                </li>
              )
            })}
          </ul>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleCheck}
            className="mt-4 w-full min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
          >
            Проверить
          </motion.button>
        </div>
      )}

      {/* Вердикт N из M + «Далее» */}
      <AnimatePresence mode="wait">
        {phase === "verdict" && (
          <motion.div
            key="verdict"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="relative rounded-2xl bg-white border-2 border-primary-100 p-5 shadow-soft"
          >
            <AnimatePresence>
              {reaction && reaction.key === 1 && (
                <StickerReaction
                  key={reaction.key}
                  id={reaction.correct ? "fire" : "oops"}
                  text={reaction.correct ? `+${score} 🗣` : undefined}
                  className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                />
              )}
            </AnimatePresence>
            <div className="text-center">
              <div className="text-6xl">{verdictGood ? "🎉" : "💪"}</div>
              <h3 className="mt-2 font-display text-2xl font-extrabold text-primary-900">
                Команда выжила: {score} из {total}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {score === total
                  ? "Идеальный план выживания — вся команда гордится тобой!"
                  : verdictGood
                    ? "Хороший план! Ещё пара реплик — и остров будет ваш."
                    : "Попробуй ещё раз — говори больше и следуй шаблонам!"}
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleNext}
              className="mt-4 w-full min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
            >
              Далее
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA: старт миссии */}
      {phase === "ready" && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleStart}
          className="w-full min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
        >
          🚀 Начать миссию
        </motion.button>
      )}
    </div>
  )
}
