"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useVerbBot } from "@/components/VerbBot"
import { useSound } from "@/lib/useSound"
import { ResultScreen } from "@/components/ResultScreen"
import { hintFor } from "@/lib/hints"

/** Одно предложение: текст + слово с ошибкой (null = «ловушка», ошибки нет). */
interface ClickMistakeItem {
  text: string
  wrong: string | null
  // Тикет W1-T3: умная обратная связь — необязательные подсказки из JSON.
  wrongExplanation?: string
  explanation?: string
  // Тикет W1-T5 «Grammar Detective»: шаги «Исправь → Объясни → Спроси».
  // Каждое поле — массив строк (верный вариант — ПЕРВЫЙ) либо массив
  // объектов { text, correct }. Если поле отсутствует/пустое — шаг
  // пропускается, и задание ведёт себя как раньше (найти ошибку → вердикт).
  fixOptions?: unknown
  explanations?: unknown
  questions?: unknown
}

interface ClickMistakeTaskProps {
  title: string
  description: string
  items: ClickMistakeItem[]
  onComplete?: (score: number, total: number) => void
}

/** Сколько неудачных кликов на предложение — и показываем правильный ответ.
 *  G2 (правки 12.08): правильный ответ показываем СРАЗУ после ПЕРВОГО
 *  неверного клика — задача «запомнить правильно», а не угадывать. */
const MAX_ATTEMPTS = 1

/** Задержка перед авто-переходом после правильного ответа (мс). */
const ADVANCE_DELAY = 950

/** Задержка перед первым шагом после нахождения ошибки (мс). */
const STEP_DELAY = 650

/** Вариант ответа шага «Исправь / Объясни / Спроси». */
interface StepOption {
  text: string
  correct: boolean
}

/** Шаги детектива (после нахождения ошибки). */
type StepKind = "fix" | "explain" | "question"

/** Состояние текущего шага. */
interface StepState {
  kind: StepKind
  selected: string | null
  checked: boolean
  isCorrect: boolean
}

/** Заголовки шагов (UI на русском). */
const STEP_TITLES: Record<StepKind, string> = {
  fix: "Исправь ошибку ✏️",
  explain: "Объясни правило 💡",
  question: "Задай вопрос к предложению ❓",
}

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

/**
 * Приводит сырое поле JSON к вариантам ответа шага.
 * Строковый массив: верный — ПЕРВЫЙ. Объектный массив { text, correct }:
 * по флагу correct; если ни один не помечен — фолбэк на первый.
 * («верный — первый или помечен», спека 4.5.)
 */
function toOptions(raw: unknown): StepOption[] {
  if (!Array.isArray(raw)) return []
  const options = raw
    .map((entry, index) => {
      if (typeof entry === "string") return { text: entry, correct: index === 0 }
      if (entry && typeof entry === "object") {
        const record = entry as { text?: unknown; correct?: unknown }
        if (typeof record.text === "string") {
          return {
            text: record.text,
            correct: typeof record.correct === "boolean" ? record.correct : index === 0,
          }
        }
      }
      return { text: String(entry), correct: index === 0 }
    })
    .filter((option) => option.text.trim().length > 0)
  // Если в объектной форме никто не помечен correct — верный первый.
  return options.some((option) => option.correct) ? options : options.map((option, i) => ({ ...option, correct: i === 0 }))
}

/** Фаза ответа на текущее предложение. */
type Phase = "idle" | "correct" | "revealed" | "step"

export function ClickMistakeTask({ title, description, items, onComplete }: ClickMistakeTaskProps) {
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [phase, setPhase] = useState<Phase>("idle")
  const [shaken, setShaken] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [step, setStep] = useState<StepState | null>(null)
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

  // Шаги детектива, которые есть у этого предложения (поля из JSON).
  const fixOptions = toOptions(item.fixOptions)
  const explanations = toOptions(item.explanations)
  const questions = toOptions(item.questions)
  const stepKinds: StepKind[] = []
  if (fixOptions.length > 0) stepKinds.push("fix")
  if (explanations.length > 0) stepKinds.push("explain")
  if (questions.length > 0) stepKinds.push("question")
  const hasSteps = stepKinds.length > 0

  /** Переход дальше (или финал) с актуальным счётом. */
  const advance = (finalScore: number) => {
    setTransitioning(false)
    setShaken(null)
    setAttempts(0)
    setPhase("idle")
    setStep(null)
    setStepIndex(0)
    if (current + 1 < items.length) {
      setCurrent((c) => c + 1)
    } else {
      setFinished(true)
      onComplete?.(finalScore, items.length)
      play("fanfare")
      say("finish")
    }
  }

  /** Начало цепочки «Исправь → Объясни → Спроси» после нахождения ошибки. */
  const beginSteps = () => {
    if (stepKinds.length === 0) return
    setTransitioning(false)
    setShaken(null)
    setAttempts(0)
    setStepIndex(0)
    setStep({ kind: stepKinds[0], selected: null, checked: false, isCorrect: false })
    setPhase("step")
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
      if (hasSteps) {
        // Показали «Верно! Ты нашёл ошибку!» — затем шаги детектива.
        setTimeout(() => beginSteps(), STEP_DELAY)
      } else {
        setTimeout(() => advance(nextScore), ADVANCE_DELAY)
      }
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
    if (isTrap || !hasSteps) {
      advance(score)
    } else {
      // Ошибку подсмотрели — цепочку «Исправь → Объясни → Спроси» всё равно проходим.
      beginSteps()
    }
  }

  /** Выбор варианта на шаге. */
  const selectOption = (text: string) => {
    if (!step || step.checked) return
    setStep({ ...step, selected: text })
  }

  /** «Проверить» на шаге — вердикт + звук + реплика бота. */
  const checkStep = () => {
    if (!step || step.checked || !step.selected) return
    const options = step.kind === "fix" ? fixOptions : step.kind === "explain" ? explanations : questions
    const chosen = options.find((option) => option.text === step.selected)
    const isCorrect = chosen?.correct ?? false
    setStep({ ...step, checked: true, isCorrect })
    if (isCorrect) {
      play("correct")
      say("correct")
    } else {
      play("wrong")
      say("wrong")
    }
  }

  /** «Дальше» после вердикта шага — следующий шаг или переход к предложению. */
  const nextStep = () => {
    if (!step || !step.checked) return
    const nextIndex = stepIndex + 1
    if (nextIndex < stepKinds.length) {
      setStepIndex(nextIndex)
      setStep({ kind: stepKinds[nextIndex], selected: null, checked: false, isCorrect: false })
    } else {
      advance(score)
    }
  }

  const retry = () => {
    setCurrent(0)
    setScore(0)
    setAttempts(0)
    setPhase("idle")
    setShaken(null)
    setFinished(false)
    setTransitioning(false)
    setStepIndex(0)
    setStep(null)
  }

  if (finished) {
    return <ResultScreen title={title} score={score} total={items.length} onRetry={retry} />
  }

  const attemptsLeft = Math.max(0, MAX_ATTEMPTS - attempts)

  // Данные текущего шага (если идёт цепочка «Исправь → Объясни → Спроси»).
  const stepOptions = step?.kind === "fix" ? fixOptions : step?.kind === "explain" ? explanations : questions
  const isLastStep = step ? stepIndex === stepKinds.length - 1 : false
  const stepCorrectText = step
    ? (step.kind === "fix" ? fixOptions : step.kind === "explain" ? explanations : questions).find((option) => option.correct)?.text ?? ""
    : ""

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
        {phase !== "step" && (
          <div className="text-xs font-semibold text-slate-400">
            Попыток осталось: {attemptsLeft}
          </div>
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
          className="py-6"
        >
          {phase === "step" && step ? (
            /* ============ Шаг «Исправь / Объясни / Спроси» ============ */
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl bg-primary-100/60 px-4 py-3">
                <p className="text-center font-display text-lg font-extrabold text-primary-900">
                  {STEP_TITLES[step.kind]}
                </p>
                {step.kind === "fix" && (
                  <p className="mt-1.5 text-center text-sm text-slate-600">
                    {words.map((word, wi) =>
                      wi === wrongIndex ? (
                        <span key={wi} className="font-bold text-danger line-through decoration-2">
                          {word}{" "}
                        </span>
                      ) : (
                        <span key={wi}>{word} </span>
                      )
                    )}
                  </p>
                )}
                {step.kind === "fix" && (
                  <p className="mt-1.5 text-center text-xs font-medium text-slate-500">
                    💡 {hintFor("click-mistake", item)}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2.5">
                {stepOptions.map((option) => {
                  let chip = "bg-white border-2 border-primary-200 hover:border-primary-400"
                  if (step.checked) {
                    if (option.correct) chip = "bg-success/10 border-2 border-success"
                    else if (option.text === step.selected) chip = "bg-danger/10 border-2 border-danger"
                  } else if (option.text === step.selected) {
                    chip = "bg-primary-100 border-2 border-primary-500"
                  }
                  return (
                    <motion.button
                      key={option.text}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => selectOption(option.text)}
                      disabled={step.checked}
                      className={`min-h-[44px] rounded-2xl px-4 py-3 text-left text-base font-semibold leading-snug text-slate-800 transition-colors ${chip}`}
                    >
                      {option.text}
                      {step.checked && option.correct && (
                        <span className="ml-1.5 inline-block font-bold text-success">✓</span>
                      )}
                      {step.checked && !option.correct && option.text === step.selected && (
                        <span className="ml-1.5 inline-block font-bold text-danger">✗</span>
                      )}
                    </motion.button>
                  )
                })}
              </div>

              <AnimatePresence>
                {step.checked && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`rounded-2xl px-4 py-3 text-center text-base font-bold ${
                      step.isCorrect ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                    }`}
                  >
                    {step.isCorrect
                      ? "Верно! 🎉"
                      : `Не совсем. Правильный ответ: «${stepCorrectText}»`}
                  </motion.div>
                )}
              </AnimatePresence>

              {!step.checked ? (
                step.selected && (
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={checkStep}
                    className="min-h-[44px] rounded-2xl bg-primary-600 px-6 py-2.5 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
                  >
                    Проверить
                  </motion.button>
                )
              ) : (
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={nextStep}
                  className="min-h-[44px] rounded-2xl bg-primary-600 px-6 py-2.5 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
                >
                  {isLastStep ? "Далее →" : "Дальше →"}
                </motion.button>
              )}
            </div>
          ) : (
            /* ============ «Найди ошибку» (исходная механика) ============ */
            <>
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
                    {/* Тикет W1-T3: умная обратная связь — подсказка из wrongExplanation
                        или эвристика по разнице ошибочного слова и контекста. */}
                    {!isTrap && (
                      <p className="text-center text-sm font-medium text-slate-600">
                        💡 {hintFor("click-mistake", item)}
                      </p>
                    )}
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
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
