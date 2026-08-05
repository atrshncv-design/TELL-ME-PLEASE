"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useVerbBot } from "@/components/VerbBot"
import { useSound } from "@/lib/useSound"
import { ResultScreen } from "@/components/ResultScreen"
import { StickerReaction } from "@/components/StickerReaction"
import { hintFor } from "@/lib/hints"

/**
 * Boss Battle (тикет W3-T3) — новый тип задания "boss-battle".
 *
 * Сюжет: «Verb Bot встречает Grammar Boss! Победи его в финальной битве!»
 * Полоска здоровья босса (5 HP) убывает за каждый верный ответ на вызове.
 * Цепочка из 6 вызовов challenges[] (fix-mistake / make-question /
 * answer-partner / tell-past / describe-now / plan-future), каждый — выбор
 * из 2-3 вариантов (паттерн QuizTask: выбрал → «Проверить» → вердикт →
 * следующий; ответ можно менять до «Проверить»).
 *
 * После 6-го вызова — финальное задание finalPlan: «You are planning a
 * school trip…» — мультивыбор предложений из пула (нужно набрать минимумы:
 * 2 Present Simple, 2 Past Simple, 2 Future, 1 вопрос, 1 отрицание;
 * счётчик N/5). Выбор можно менять до «Проверить план» → вердикт по
 * минимумам → финальный вердикт «Вызовы N из 6 + план M/5» → ResultScreen.
 *
 * Счёт: score = верные вызовы + выполненные минимумы плана (0..5),
 * total = challenges.length + 5. Начисление: тип в SPEAKING_TASK_TYPES
 * (финал речевой по духу — «планируем школьную поездку») → «+N 🗣».
 */

/** Тип вызова Grammar Boss (W3-T3). */
export type BossBattleChallengeType =
  | "fix-mistake"
  | "make-question"
  | "answer-partner"
  | "tell-past"
  | "describe-now"
  | "plan-future"

/** Один вызов Grammar Boss: тип + заголовок + текст + выбор из 2-3 вариантов. */
export interface BossBattleChallenge {
  type: BossBattleChallengeType
  title: string
  /** Текст вызова: предложение с ошибкой / слова для вопроса / вопрос. */
  sentence?: string
  /** fix-mistake: слово с ошибкой для зачёркивания (необязательно). */
  wrong?: string
  /** make-question: подсказка-слова для вопроса (необязательно). */
  prompt?: string
  options: string[]
  answer: string
  /** Умная обратная связь (W1-T3) — идёт в hintFor первой. */
  wrongExplanation?: string
}

/** Ключ требования финального плана (W3-T3). */
export type BossBattlePlanKind = "present" | "past" | "future" | "question" | "negative"

/** Одно предложение пула финального плана поездки. */
export interface BossBattlePlanSentence {
  text: string
  kind: BossBattlePlanKind
}

/** Финальное задание: «планируем школьную поездку» (мультивыбор по минимумам). */
export interface BossBattleFinalPlan {
  /** Сценарий по-английски: «You are planning a school trip…». */
  intro: string
  /** Пул предложений (~10-12): выбираются тапом, можно перевыбирать. */
  sentences: BossBattlePlanSentence[]
  /** Минимумы по типам (по умолчанию 2/2/2/1/1). */
  requirements?: Partial<Record<BossBattlePlanKind, number>>
}

interface BossBattleTaskProps {
  title: string
  description: string
  challenges: BossBattleChallenge[]
  finalPlan?: BossBattleFinalPlan
  onComplete?: (score: number, total: number) => void
}

/** Максимальное HP Grammar Boss (убывает за каждый верный ответ). */
const MAX_HP = 5

const LETTERS = ["A", "B", "C"]

/** Подписи типов вызовов (русский UI). */
const CHALLENGE_LABEL: Record<BossBattleChallengeType, string> = {
  "fix-mistake": "Исправь ошибку",
  "make-question": "Составь вопрос",
  "answer-partner": "Ответь полным предложением",
  "tell-past": "Расскажи о прошлом",
  "describe-now": "Опиши, что происходит сейчас",
  "plan-future": "Спланируй будущее",
}

/** Порядок минимумов финального плана (счётчик N/5). */
const PLAN_KINDS: BossBattlePlanKind[] = ["present", "past", "future", "question", "negative"]

/** Подписи минимумов финального плана (русский UI). */
const PLAN_LABEL: Record<BossBattlePlanKind, string> = {
  present: "Present Simple",
  past: "Past Simple",
  future: "Future (will)",
  question: "Вопрос",
  negative: "Отрицание",
}

/** Минимумы по умолчанию: 2 Present, 2 Past, 2 Future, 1 вопрос, 1 отрицание. */
const DEFAULT_REQUIREMENTS: Record<BossBattlePlanKind, number> = {
  present: 2,
  past: 2,
  future: 2,
  question: 1,
  negative: 1,
}

/** Полоска здоровья Grammar Boss: 5 сегментов, гаснут за верные ответы. */
function BossHpBar({ hp }: { hp: number }) {
  return (
    <div className="rounded-2xl border-2 border-primary-100 bg-white p-3 shadow-soft">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
          <span className="text-base" aria-hidden>👹</span> Grammar Boss
        </span>
        <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-black text-danger">
          HP {hp}/{MAX_HP}
        </span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: MAX_HP }).map((_, i) => (
          <motion.div
            key={i}
            animate={i < hp ? { scale: 1, opacity: 1 } : { scale: 0.75, opacity: 0.3 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            className={`h-3.5 flex-1 rounded-full ${i < hp ? "bg-danger" : "bg-slate-200"}`}
          />
        ))}
      </div>
    </div>
  )
}

/** Чип одного минимума плана: «Present Simple 2/2 ✓». */
function RequirementChip({
  kind,
  need,
  count,
}: {
  kind: BossBattlePlanKind
  need: number
  count: number
}) {
  const ok = count >= need
  return (
    <div
      className={`rounded-full border px-3 py-1 text-xs font-bold ${
        ok
          ? "border-success/40 bg-success/10 text-success"
          : "border-slate-200 bg-slate-100 text-slate-500"
      }`}
    >
      {PLAN_LABEL[kind]} {count}/{need} {ok ? "✓" : ""}
    </div>
  )
}

export function BossBattleTask({
  title,
  description,
  challenges,
  finalPlan,
  onComplete,
}: BossBattleTaskProps) {
  const { say } = useVerbBot()
  const { play } = useSound()

  // === Фаза вызовов ===
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [challengeScore, setChallengeScore] = useState(0)
  const [bossHp, setBossHp] = useState(MAX_HP)
  const [reaction, setReaction] = useState<{ key: number; correct: boolean } | null>(null)

  // === Финальный план ===
  const [planSelected, setPlanSelected] = useState<string[]>([])
  const [planChecked, setPlanChecked] = useState(false)

  // === Фазы ===
  const [planPhase, setPlanPhase] = useState(false)
  const [planVerdict, setPlanVerdict] = useState(false)
  const [finalVerdict, setFinalVerdict] = useState(false)
  const [finished, setFinished] = useState(false)

  if (!challenges || challenges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <p className="text-slate-500">Нет данных для отображения</p>
      </div>
    )
  }

  const totalChallenges = challenges.length
  const challenge = challenges[current]

  const planSentences = finalPlan?.sentences || []
  const requirements: Record<BossBattlePlanKind, number> = {
    ...DEFAULT_REQUIREMENTS,
    ...(finalPlan?.requirements || {}),
  }
  const sentenceKind = new Map<string, BossBattlePlanKind>(
    planSentences.map((s) => [s.text, s.kind]),
  )
  const countFor = (kind: BossBattlePlanKind) =>
    planSelected.filter((t) => sentenceKind.get(t) === kind).length
  const metKinds = PLAN_KINDS.filter((k) => countFor(k) >= requirements[k])
  const planScore = metKinds.length
  // Сколько предложений нужно набрать суммарно (для подсказки в UI).
  const totalNeeded = PLAN_KINDS.reduce((acc, k) => acc + requirements[k], 0)

  // === Обработчики: вызовы ===
  // Клик по варианту только ВЫБИРАЕТ ответ — проверка отложена до «Проверить»
  // (паттерн QuizTask; ответ можно менять до проверки).
  const handleSelect = (option: string) => {
    if (checked) return
    setSelected(option)
  }

  // «Проверить»: вердикт вызова — верный ответ наносит удар (HP босса −1),
  // неверный — просто промах (HP не меняется). Счёт +1 за верный.
  const handleCheck = () => {
    if (checked || selected === null) return
    const ok = selected === challenge.answer
    if (ok) {
      setChallengeScore((s) => s + 1)
      setBossHp((hp) => Math.max(0, hp - 1))
    }
    setCorrect(ok)
    setChecked(true)
    say(ok ? "correct" : "wrong")
    play(ok ? "correct" : "wrong")
    setReaction({ key: current, correct: ok })
  }

  // «Далее» после вердикта: следующий вызов → финальный план после 6-го.
  const handleNext = () => {
    setReaction(null)
    if (current + 1 < totalChallenges) {
      const nextIndex = current + 1
      setCurrent(nextIndex)
      setSelected(null)
      setChecked(false)
      setCorrect(false)
    } else {
      setPlanPhase(true)
    }
  }

  // === Обработчики: финальный план ===
  const togglePlanSentence = (text: string) => {
    if (planChecked) return
    setPlanSelected((prev) =>
      prev.includes(text) ? prev.filter((t) => t !== text) : [...prev, text],
    )
  }

  // «Проверить план»: вердикт по минимумам (сколько групп из 5 набрано).
  const handlePlanCheck = () => {
    if (planChecked || planSelected.length === 0) return
    setPlanChecked(true)
    say(planScore === 5 ? "correct" : "wrong")
    play(planScore === 5 ? "correct" : "wrong")
  }

  // «Далее» после вердикта плана → финальный вердикт битвы.
  const handlePlanNext = () => {
    setPlanVerdict(false)
    setFinalVerdict(true)
  }

  // Финальный вердикт → ResultScreen; onComplete(score, total) ровно один раз.
  const handleFinalNext = () => {
    setFinished(true)
    onComplete?.(challengeScore + planScore, totalChallenges + PLAN_KINDS.length)
    say("finish")
    play("fanfare")
  }

  const retry = () => {
    setCurrent(0)
    setSelected(null)
    setChecked(false)
    setCorrect(false)
    setChallengeScore(0)
    setBossHp(MAX_HP)
    setReaction(null)
    setPlanSelected([])
    setPlanChecked(false)
    setPlanPhase(false)
    setPlanVerdict(false)
    setFinalVerdict(false)
    setFinished(false)
  }

  if (finished) {
    return (
      <ResultScreen
        title={title}
        score={challengeScore + planScore}
        total={totalChallenges + PLAN_KINDS.length}
        onRetry={retry}
        taskType="boss-battle"
      />
    )
  }

  // Подсказка hintFor под вердиктом неверного вызова (wrongExplanation из JSON
  // или дефолтная фраза; типа в PHRASES нет — фолбэк «Попробуй ещё раз!»).
  const wrongHint =
    checked && !correct ? hintFor(challenge.type, challenge, selected ?? undefined) : null

  // Текст вызова: предложение с ошибкой / слова для вопроса / вопрос.
  const displayText = challenge.sentence || challenge.prompt || ""

  // fix-mistake: ошибочное слово зачёркнуто (как в Grammar Detective / EscapeRoom).
  const renderChallengeText = () => {
    if (challenge.type !== "fix-mistake" || !challenge.wrong || !challenge.sentence) {
      return <span>{displayText}</span>
    }
    const idx = challenge.sentence.toLowerCase().indexOf(challenge.wrong.toLowerCase())
    if (idx === -1) return <span>{challenge.sentence}</span>
    return (
      <span>
        {challenge.sentence.slice(0, idx)}
        <s className="text-danger decoration-danger/70 decoration-2">{challenge.wrong}</s>
        {challenge.sentence.slice(idx + challenge.wrong.length)}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-primary-900">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>

      <AnimatePresence mode="wait">
        {finalVerdict ? (
          /* === Финальный вердикт битвы: вызовы + план → ResultScreen === */
          <motion.div
            key="final"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="relative rounded-2xl bg-white border-2 border-primary-100 p-6 text-center shadow-soft"
          >
            <div className="text-6xl">
              {challengeScore === totalChallenges && planScore === PLAN_KINDS.length
                ? "🏆"
                : challengeScore + planScore >= Math.ceil((totalChallenges + PLAN_KINDS.length) / 2)
                  ? "⚔️"
                  : "💪"}
            </div>
            <h3 className="mt-2 font-display text-2xl font-extrabold text-primary-900">
              {challengeScore === totalChallenges && planScore === PLAN_KINDS.length
                ? "Grammar Boss повержен!"
                : "Битва окончена!"}
            </h3>
            <div className="mt-3 flex flex-col items-center gap-1.5 text-base font-bold text-slate-700">
              <span>
                Вызовы: {challengeScore} из {totalChallenges}
              </span>
              <span>
                План поездки: {planScore} из {PLAN_KINDS.length}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {challengeScore === totalChallenges && planScore === PLAN_KINDS.length
                ? "Идеальная битва! Verb Bot гордится тобой!"
                : "Повтори задание, чтобы победить Grammar Boss без промахов!"}
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleFinalNext}
              className="mt-4 w-full min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
            >
              Далее
            </motion.button>
          </motion.div>
        ) : planVerdict ? (
          /* === Вердикт финального плана: сколько минимумов из 5 набрано === */
          <motion.div
            key="plan-verdict"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="relative rounded-2xl bg-white border-2 border-primary-100 p-6 text-center shadow-soft"
          >
            <div className="text-6xl">{planScore === PLAN_KINDS.length ? "🧳✨" : "🧳"}</div>
            <h3 className="mt-2 font-display text-2xl font-extrabold text-primary-900">
              План поездки: {planScore} из {PLAN_KINDS.length}
            </h3>
            <div className="mt-3 flex flex-col gap-1.5">
              {PLAN_KINDS.map((k) => {
                const need = requirements[k]
                const count = countFor(k)
                const ok = count >= need
                return (
                  <div
                    key={k}
                    className={`flex items-center justify-between rounded-xl px-3 py-1.5 text-sm font-bold ${
                      ok ? "bg-success/10 text-success" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <span>{PLAN_LABEL[k]}</span>
                    <span>
                      {count}/{need} {ok ? "✓" : "✗"}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-sm text-slate-500">
              {planScore === PLAN_KINDS.length
                ? "Отличный план — Grammar Boss впечатлён!"
                : "Не все минимумы набраны. В следующий раз собери все 5!"}
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handlePlanNext}
              className="mt-4 w-full min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
            >
              Далее →
            </motion.button>
          </motion.div>
        ) : planPhase ? (
          /* === Финальное задание: планируем школьную поездку === */
          <motion.div
            key="plan"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="rounded-full bg-speaking-100 px-3 py-1 text-xs font-bold text-speaking-700">
                Финальное задание
              </div>
              <div className="text-xs font-semibold text-slate-400">
                Минимумы: {planScore}/{PLAN_KINDS.length}
              </div>
            </div>

            <div className="rounded-2xl border-2 border-primary-100 bg-white p-4 shadow-soft">
              <p className="text-center text-lg font-semibold leading-relaxed text-slate-800">
                {finalPlan?.intro || "You are planning a school trip."}
              </p>
              <p className="mt-2 text-center text-sm text-slate-500">
                Выбери предложения для плана: всего нужно {totalNeeded} — по минимумам ниже.
                Выбор можно менять до кнопки «Проверить план».
              </p>
            </div>

            {/* Счётчик минимумов 5/5: чип на каждый тип */}
            <div className="flex flex-wrap justify-center gap-2">
              {PLAN_KINDS.map((k) => (
                <RequirementChip key={k} kind={k} need={requirements[k]} count={countFor(k)} />
              ))}
            </div>

            {/* Пул предложений: тап — выбрать/убрать (мультивыбор, до «Проверить план») */}
            <div className="relative flex flex-col gap-2.5">
              {planSentences.map((s) => {
                const isSelected = planSelected.includes(s.text)
                return (
                  <motion.button
                    key={s.text}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => togglePlanSentence(s.text)}
                    disabled={planChecked}
                    className={`flex min-h-[52px] items-center gap-2.5 rounded-2xl border-2 px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? "border-primary-600 bg-primary-100"
                        : "border-primary-200 bg-white hover:border-primary-400"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                        isSelected ? "bg-primary-600 text-white" : "bg-primary-100 text-primary-700"
                      }`}
                    >
                      {isSelected ? "✓" : "+"}
                    </span>
                    <span className="flex-1 text-base font-bold leading-snug text-slate-800">
                      {s.text}
                    </span>
                  </motion.button>
                )
              })}
            </div>

            {/* CTA плана: «Проверить план» (когда выбрано ≥1 предложение) */}
            <div className="mt-1">
              {!planChecked ? (
                planSelected.length > 0 && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handlePlanCheck}
                    className="w-full min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
                  >
                    Проверить план
                  </motion.button>
                )
              ) : (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handlePlanNext}
                  className="w-full min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
                >
                  Далее →
                </motion.button>
              )}
            </div>
          </motion.div>
        ) : (
          /* === Вызов Grammar Boss: цепочка из 6 === */
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="flex flex-col gap-4"
          >
            {/* Полоска здоровья босса: убывает за верные ответы */}
            <BossHpBar hp={bossHp} />

            {/* Шапка вызова */}
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-400">
                Вызов {current + 1} из {totalChallenges}
              </div>
              <div className="rounded-full bg-grammar-100 px-3 py-1 text-xs font-bold text-grammar-700">
                {CHALLENGE_LABEL[challenge.type]}
              </div>
            </div>
            <h3 className="font-display text-xl font-extrabold text-primary-900">{challenge.title}</h3>

            {/* Текст вызова: предложение/слова/вопрос */}
            <div className="rounded-2xl border-2 border-primary-100 bg-white p-4 text-center shadow-soft">
              {challenge.type === "make-question" && challenge.prompt && (
                <p className="mb-2 text-sm text-slate-500">{challenge.prompt}</p>
              )}
              {challenge.type === "answer-partner" && challenge.sentence && (
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Вопрос
                </p>
              )}
              <p className="text-lg font-semibold leading-relaxed text-slate-800">
                {renderChallengeText()}
              </p>
              {challenge.type === "answer-partner" && (
                <p className="mt-2 text-sm text-slate-500">Ответь полным предложением</p>
              )}
              {challenge.type === "tell-past" && (
                <p className="mt-2 text-sm text-slate-500">Выбери предложение о прошлом</p>
              )}
              {challenge.type === "describe-now" && (
                <p className="mt-2 text-sm text-slate-500">Выбери предложение о настоящем</p>
              )}
              {challenge.type === "plan-future" && (
                <p className="mt-2 text-sm text-slate-500">Выбери предложение о будущем</p>
              )}
            </div>

            {/* Варианты ответа (выбрал → «Проверить» → вердикт, паттерн QuizTask) */}
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
              {(challenge.options || []).map((opt, oi) => {
                const isAnswer = opt === challenge.answer
                const isSelected = opt === selected
                let bg = "bg-white border-2 border-primary-200 hover:border-primary-400"
                let chip = "bg-primary-100 text-primary-700"
                if (checked && isAnswer) {
                  bg = "bg-success/10 border-2 border-success"
                  chip = "bg-success text-white"
                } else if (checked && isSelected && !isAnswer) {
                  bg = "bg-danger/10 border-2 border-danger"
                  chip = "bg-danger text-white"
                } else if (!checked && isSelected) {
                  bg = "bg-primary-100 border-2 border-primary-600"
                  chip = "bg-primary-600 text-white"
                }
                return (
                  <motion.button
                    key={opt}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSelect(opt)}
                    disabled={checked}
                    animate={
                      checked && isAnswer
                        ? { scale: [1, 1.06, 1] }
                        : checked && isSelected && !isAnswer
                          ? { x: [0, -8, 8, -5, 5, 0] }
                          : {}
                    }
                    transition={
                      checked && isAnswer
                        ? { duration: 0.5, ease: "easeOut" }
                        : checked && isSelected && !isAnswer
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
                    <span className="flex-1 text-lg font-bold leading-snug text-slate-800">{opt}</span>
                    {checked && isAnswer && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 15 }}
                        className="text-xl text-success"
                      >
                        ✓
                      </motion.span>
                    )}
                    {checked && isSelected && !isAnswer && (
                      <span className="text-xl text-danger">✗</span>
                    )}
                  </motion.button>
                )
              })}
            </div>

            {/* Подсказка hintFor под вердиктом неверного ответа */}
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

            {/* Вердикт вызова (после «Проверить») */}
            <AnimatePresence>
              {checked && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`rounded-2xl px-4 py-3 text-center font-display text-lg font-extrabold ${
                    correct ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                  }`}
                >
                  {correct ? "🎯 Точный удар! Boss теряет 1 HP" : "🛡️ Boss отразил удар…"}
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA: «Проверить» (когда ответ выбран) → после вердикта «Далее» */}
            <div className="mt-1">
              {!checked ? (
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
                  onClick={handleNext}
                  className="w-full min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
                >
                  {current + 1 < totalChallenges ? "Далее →" : "Финальное задание →"}
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
