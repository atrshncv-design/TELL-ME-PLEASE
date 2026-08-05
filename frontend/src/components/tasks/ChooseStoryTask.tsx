"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useVerbBot } from "@/components/VerbBot"
import { useSound } from "@/lib/useSound"
import { ResultScreen } from "@/components/ResultScreen"
import { StickerReaction } from "@/components/StickerReaction"

/**
 * Choose Your Story (тикет W1-T4) — новый тип задания "choose-story".
 *
 * 3 шага: «Выбери» (персонаж/место/проблема) → «Построй рассказ» (по схеме
 * sentencePatterns из JSON) → «Оцени» (самооценка ⭐/☐ по 3 параметрам).
 * «Проверить» → вердикт по АВТО-ПРОВЕРКЕ времён (простая эвристика по
 * ключевым словам — список в TENSES ниже, в компоненте) → «Далее» →
 * ResultScreen. Начисление: onComplete(score, total) → saveTask с типом
 * "choose-story" (в SPEAKING_TASK_TYPES → награда 🗣 Communication).
 *
 * scaffold="full" — готовые начала: плейсхолдеры {char}/{place}/{problem}
 * в шаблонах рендерятся select-ами (выборы с шага 1). scaffold="keywords" —
 * textarea со свободным вводом + ключевые слова-подсказки.
 */

interface ChooseStoryTaskProps {
  title: string
  description: string
  scaffold: "full" | "keywords"
  characters: string[]
  places: string[]
  problems: string[]
  sentencePatterns: string[]
  keywords?: string[]
  onComplete?: (score: number, total: number) => void
}

// === Авто-проверка времён (W1-T4): простая эвристика, список слов в компоненте.
const PAST_SIMPLE_RE =
  /\b(?:went|was|were|had|saw|found|came|said|told|did|made|took|gave|ate|ran|met|got|put|lost|asked|looked|wanted|played|helped|opened|started|stopped|walked|waited|tried|decided)\b/i
const PAST_CONTINUOUS_RE = /\b(?:was|were)\s+[a-z]+ing\b/i
const FUTURE_RE = /\b(?:will|won'?t|going to)\b/i

interface TenseDef {
  id: string
  label: string
  ru: string
  check: (text: string) => boolean
}

const TENSES: TenseDef[] = [
  { id: "past", label: "Past Simple", ru: "прошедшее простое", check: (t) => PAST_SIMPLE_RE.test(t) },
  { id: "pastCont", label: "Past Continuous", ru: "прошедшее длительное", check: (t) => PAST_CONTINUOUS_RE.test(t) },
  { id: "future", label: "Future", ru: "будущее", check: (t) => FUTURE_RE.test(t) },
]

const PLACEHOLDER_RE = /\{char\}|\{place\}|\{problem\}/g

/** Карточка-кнопка выбора (шаг 1). Тап-таргет ≥ 44px. */
function ChoiceGroup({
  label,
  values,
  selected,
  onSelect,
}: {
  label: string
  values: string[]
  selected: string | null
  onSelect: (v: string) => void
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="grid grid-cols-1 gap-2.5">
        {values.map((v) => {
          const isSel = selected === v
          return (
            <motion.button
              key={v}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelect(v)}
              className={`flex min-h-[52px] items-center justify-between gap-2 rounded-2xl border-2 px-4 py-2 text-left text-lg font-bold transition-colors ${
                isSel
                  ? "border-primary-600 bg-primary-100 text-primary-800"
                  : "border-primary-200 bg-white text-slate-700 hover:border-primary-400"
              }`}
            >
              <span>{v}</span>
              {isSel && <span className="text-xl text-primary-700">✓</span>}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

/** Самооценка по одному параметру (шаг 3): пара кнопок ⭐ / ☐. */
function SelfToggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-primary-200 bg-white px-4 py-2">
      <span className="flex-1 text-base font-semibold text-slate-700">{label}</span>
      <div className="flex gap-2">
        <button
          type="button"
          aria-label={`${label}: да`}
          aria-pressed={value}
          onClick={() => onChange(true)}
          className={`flex min-h-[44px] min-w-[52px] items-center justify-center rounded-xl border-2 text-xl transition-colors ${
            value
              ? "border-primary-600 bg-primary-600 text-white"
              : "border-primary-200 bg-white text-primary-400 hover:border-primary-400"
          }`}
        >
          ⭐
        </button>
        <button
          type="button"
          aria-label={`${label}: нет`}
          aria-pressed={!value}
          onClick={() => onChange(false)}
          className={`flex min-h-[44px] min-w-[52px] items-center justify-center rounded-xl border-2 text-xl transition-colors ${
            !value
              ? "border-primary-600 bg-primary-600 text-white"
              : "border-primary-200 bg-white text-slate-300 hover:border-primary-400"
          }`}
        >
          ☐
        </button>
      </div>
    </div>
  )
}

export function ChooseStoryTask({
  title,
  description,
  scaffold,
  characters,
  places,
  problems,
  sentencePatterns,
  keywords,
  onComplete,
}: ChooseStoryTaskProps) {
  const [step, setStep] = useState(1)
  const [char, setChar] = useState<string | null>(null)
  const [place, setPlace] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  // scaffold="keywords": свободный текст рассказа.
  const [storyText, setStoryText] = useState("")
  // Самооценка (шаг 3): правильность времени / логика / выразительность.
  const [selfTense, setSelfTense] = useState(false)
  const [selfLogic, setSelfLogic] = useState(false)
  const [selfExpress, setSelfExpress] = useState(false)
  const [checked, setChecked] = useState(false)
  const [score, setScore] = useState(0)
  const [foundIds, setFoundIds] = useState<string[]>([])
  const [reaction, setReaction] = useState<{ key: number; correct: boolean } | null>(null)
  const [finished, setFinished] = useState(false)
  const { say } = useVerbBot()
  const { play } = useSound()

  const mode: "full" | "keywords" = scaffold === "keywords" ? "keywords" : "full"

  if (!characters.length || !places.length || !problems.length || !sentencePatterns.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <p className="text-slate-500">Нет данных для отображения</p>
      </div>
    )
  }

  /** Собирает текст рассказа: плейсхолдеры → выбранные слова (scaffold=full). */
  const composeStory = (): string => {
    const map: Record<string, string> = {
      "{char}": char ?? characters[0],
      "{place}": place ?? places[0],
      "{problem}": problem ?? problems[0],
    }
    return sentencePatterns
      .map((p) => p.replace(PLACEHOLDER_RE, (m) => map[m] ?? m))
      .join(" ")
  }

  const storyForCheck = mode === "full" ? composeStory() : storyText
  const selfCount = [selfTense, selfLogic, selfExpress].filter(Boolean).length

  // «Проверить»: вердикт по авто-проверке времён + звук + say + стикер.
  const handleCheck = () => {
    if (checked) return
    const found = TENSES.filter((t) => t.check(storyForCheck)).map((t) => t.id)
    const s = found.length
    const correct = s === TENSES.length
    setFoundIds(found)
    setScore(s)
    setChecked(true)
    say(correct ? "correct" : "wrong")
    play(correct ? "correct" : "wrong")
    setReaction({ key: 3, correct })
  }

  // «Далее» после вердикта: финал (1 задание) → ResultScreen, onComplete 1 раз.
  const advance = () => {
    setFinished(true)
    onComplete?.(score, TENSES.length)
    say("finish")
    play("fanfare")
  }

  const goBack = () => setStep((s) => Math.max(1, s - 1))

  const retry = () => {
    setStep(1)
    setChar(null)
    setPlace(null)
    setProblem(null)
    setStoryText("")
    setSelfTense(false)
    setSelfLogic(false)
    setSelfExpress(false)
    setChecked(false)
    setScore(0)
    setFoundIds([])
    setReaction(null)
    setFinished(false)
  }

  if (finished) {
    return (
      <ResultScreen title={title} score={score} total={TENSES.length} onRetry={retry} taskType="choose-story" />
    )
  }

  const canNextFrom1 = char !== null && place !== null && problem !== null
  const canNextFrom2 = mode === "full" || storyText.trim().length > 0
  const showBack = step > 1 && !(step === 3 && checked)

  const verdictText =
    score === 3
      ? "Супер! Ты использовал(а) все три времени!"
      : score === 2
        ? "Хорошо! Одно время потерялось — посмотри на подсказку и попробуй ещё раз."
        : "Рассказ готов, но времён маловато. Добавь слова про прошлое и будущее!"

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-primary-900">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>

      <div className="flex items-center justify-between gap-2">
        {showBack ? (
          <button
            onClick={goBack}
            className="min-h-[44px] text-sm font-semibold text-slate-500 hover:text-slate-700"
          >
            ← Назад
          </button>
        ) : (
          <span className="text-sm text-transparent select-none">← Назад</span>
        )}
        <div className="text-xs font-semibold text-slate-400">Шаг {step} из 3</div>
        <span className="text-sm text-transparent select-none">Вперёд →</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-speaking-400"
          animate={{ width: `${(step / 3) * 100}%` }}
          transition={{ type: "spring", stiffness: 150, damping: 22 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${step}-${checked ? "c" : "o"}`}
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -30, opacity: 0 }}
          className="relative flex flex-col gap-4"
        >
          {step === 1 && (
            <>
              <p className="text-base font-semibold text-slate-700">
                Выбери героя, место и проблему для своей истории:
              </p>
              <ChoiceGroup label="Персонаж" values={characters} selected={char} onSelect={setChar} />
              <ChoiceGroup label="Место" values={places} selected={place} onSelect={setPlace} />
              <ChoiceGroup label="Проблема" values={problems} selected={problem} onSelect={setProblem} />
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-base font-semibold text-slate-700">
                {mode === "full"
                  ? "Построй рассказ — выбери слова в каждом предложении:"
                  : "Напиши рассказ (3 предложения). Используй ключевые слова:"}
              </p>

              {mode === "full" ? (
                <div className="flex flex-col gap-3">
                  {sentencePatterns.map((pattern, pi) => (
                    <div
                      key={pi}
                      className="rounded-2xl border-2 border-primary-200 bg-white px-4 py-3 text-lg font-bold leading-relaxed text-slate-800"
                    >
                      {pattern.split(/(\{char\}|\{place\}|\{problem\})/g).map((part, i) => {
                        if (part === "{char}") {
                          return (
                            <select
                              key={i}
                              value={char ?? ""}
                              onChange={(e) => setChar(e.target.value)}
                              aria-label="Персонаж"
                              className="mx-1 min-h-[44px] rounded-xl border-2 border-primary-300 bg-primary-50 px-2 py-1 text-base font-bold text-primary-800"
                            >
                              {characters.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          )
                        }
                        if (part === "{place}") {
                          return (
                            <select
                              key={i}
                              value={place ?? ""}
                              onChange={(e) => setPlace(e.target.value)}
                              aria-label="Место"
                              className="mx-1 min-h-[44px] rounded-xl border-2 border-primary-300 bg-primary-50 px-2 py-1 text-base font-bold text-primary-800"
                            >
                              {places.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                          )
                        }
                        if (part === "{problem}") {
                          return (
                            <select
                              key={i}
                              value={problem ?? ""}
                              onChange={(e) => setProblem(e.target.value)}
                              aria-label="Проблема"
                              className="mx-1 min-h-[44px] rounded-xl border-2 border-primary-300 bg-primary-50 px-2 py-1 text-base font-bold text-primary-800"
                            >
                              {problems.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                          )
                        }
                        return <span key={i}>{part}</span>
                      })}
                    </div>
                  ))}
                  <p className="rounded-2xl bg-primary-50 px-4 py-3 text-base font-semibold text-primary-900">
                    {composeStory()}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <textarea
                    value={storyText}
                    onChange={(e) => setStoryText(e.target.value)}
                    placeholder="Напиши рассказ по-английски…"
                    className="min-h-[160px] w-full rounded-2xl border-2 border-primary-200 bg-white p-3 text-base leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none"
                  />
                  {keywords && keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {keywords.map((k) => (
                        <span
                          key={k}
                          className="rounded-full border-2 border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-bold text-primary-700"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-base font-semibold text-slate-700">Твой рассказ:</p>
              <p className="rounded-2xl border-2 border-primary-200 bg-white px-4 py-3 text-lg font-semibold leading-relaxed text-slate-800">
                {storyForCheck || "…"}
              </p>

              {!checked ? (
                <>
                  <p className="text-base font-semibold text-slate-700">Оцени себя:</p>
                  <div className="flex flex-col gap-2.5">
                    <SelfToggle label="Времена использованы правильно" value={selfTense} onChange={setSelfTense} />
                    <SelfToggle label="История логичная и понятная" value={selfLogic} onChange={setSelfLogic} />
                    <SelfToggle label="Рассказ выразительный и живой" value={selfExpress} onChange={setSelfExpress} />
                  </div>
                </>
              ) : (
                <>
                  {/* Стикер-реакция на вердикт (правило «один на экран»). */}
                  <AnimatePresence>
                    {reaction && reaction.key === 3 && (
                      <StickerReaction
                        key={reaction.key}
                        id={reaction.correct ? "fire" : "oops"}
                        text={reaction.correct ? `+${score} 🗣` : undefined}
                        className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                      />
                    )}
                  </AnimatePresence>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border-2 border-primary-200 bg-white p-4"
                  >
                    <p className="text-base font-extrabold text-primary-900">Вердикт бота</p>
                    <p className="mt-1 text-sm font-semibold text-slate-600">{verdictText}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {TENSES.map((t) => {
                        const found = foundIds.includes(t.id)
                        return (
                          <span
                            key={t.id}
                            className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-bold ${
                              found
                                ? "border-success bg-success/10 text-success"
                                : "border-danger bg-danger/10 text-danger"
                            }`}
                          >
                            {found ? "✓" : "✗"} {t.label}
                          </span>
                        )
                      })}
                    </div>
                    <p className="mt-3 text-sm text-slate-500">
                      Времён найдено: {score} из {TENSES.length} · Самооценка: {selfCount} из 3
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Past Simple — {TENSES[0].ru} · Past Continuous — {TENSES[1].ru} · Future — {TENSES[2].ru}
                    </p>
                  </motion.div>
                </>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* CTA: шаг 1/2 — «Далее», шаг 3 до проверки — «Проверить», после — «Далее». */}
      <div className="mt-1">
        {step === 1 ? (
          canNextFrom1 && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setStep(2)}
              className="w-full min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
            >
              Далее
            </motion.button>
          )
        ) : step === 2 ? (
          canNextFrom2 && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setStep(3)}
              className="w-full min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
            >
              Далее
            </motion.button>
          )
        ) : !checked ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleCheck}
            className="w-full min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
          >
            Проверить
          </motion.button>
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
