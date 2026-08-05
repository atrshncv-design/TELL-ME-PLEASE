"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useVerbBot } from "@/components/VerbBot"
import { useSound } from "@/lib/useSound"
import { ResultScreen } from "@/components/ResultScreen"
import { StickerReaction } from "@/components/StickerReaction"
import { hintFor } from "@/lib/hints"
import { useSpeechRecognition } from "@/lib/useSpeechRecognition"
import { LevelFlow, LEVEL_FLOW_STEPS } from "./LevelFlow"

/**
 * Grammar Escape Room (тикет W2-T4) — новый тип задания "escape-room".
 *
 * Сюжет: «Verb Bot в закрытой лаборатории. Пройди 5 станций, чтобы открыть
 * дверь!» Прогресс — ряд из 5 значков дверей (открываются по мере
 * прохождения станций). Станции из JSON stations[] ({type, title, data}):
 *   1) fill-gap       — вставить правильную форму глагола (1 пропуск, выбор);
 *   2) fix-mistake    — выбрать исправление предложения (2-3 варианта);
 *   3) make-question  — выбрать верный вопрос (из 3);
 *   4) full-answer    — выбрать полный ответ (из 3);
 *   5) code-phrase    — «произнеси кодовую фразу» (push-to-talk STT,
 *                       засчитывается по ключевым словам; фолбэк-кнопка
 *                       «Произнёс» без STT, если микрофон недоступен).
 * Каждая станция: «Проверить» → вердикт (подсказка hintFor при ошибке) →
 * следующая дверь открывается → «Далее». После 5-й станции — финальный
 * вердикт «N из 5» → ResultScreen. Начисление: тип НЕ в SPEAKING_TASK_TYPES
 * (только 1 из 5 станций речевая) → обычная награда ⚡ Energy; кодовая фраза
 * включена в score.
 */

/** Типы станций Grammar Escape Room (W2-T4). */
export type EscapeRoomStationType =
  | "fill-gap"
  | "fix-mistake"
  | "make-question"
  | "full-answer"
  | "code-phrase"

/** Одна станция: тип + заголовок + данные (своя форма data на каждый тип). */
export interface EscapeRoomStation {
  type: EscapeRoomStationType
  title: string
  data: {
    /** fill-gap: предложение с ___ (вставь форму). */
    sentence?: string
    /** fix-mistake: ошибочное слово для зачёркивания (необязательно). */
    wrong?: string
    /** make-question: подсказка/слова для вопроса. */
    prompt?: string
    /** full-answer: вопрос, на который отвечаем полным предложением. */
    question?: string
    /** code-phrase: кодовую фразу произносим вслух. */
    phrase?: string
    /** code-phrase: ключевые слова для зачёта распознанного текста. */
    keywords?: string[]
    /** Выбор для станций-выборов (fill-gap/fix-mistake/make-question/full-answer). */
    options?: string[]
    answer?: string
    /** Умная обратная связь (тикет W1-T3) — идёт в hintFor первой. */
    wrongExplanation?: string
    explanation?: string
    hint?: string
  }
}

interface EscapeRoomTaskProps {
  title: string
  description: string
  stations: EscapeRoomStation[]
  onComplete?: (score: number, total: number) => void
  /** W3-T4: показывать лесенку этапов уровня (поле levelFlow: true в JSON).
   *  Пока TaskRenderer не передаёт проп (параллельный батч boss-battle),
   *  undefined = показывать: пилот escape_room_1 уже помечен в контенте;
   *  после проводки пропа undefined начнёт означать «скрыто». */
  levelFlow?: boolean
}

const LETTERS = ["A", "B", "C", "D"]

/** Экранирование regex-спецсимволов (ключевые слова ищем как целые слова). */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Закрытая/открытая/активная дверь — SVG-значок прогресса (W2-T4). */
function DoorIcon({ state }: { state: "open" | "active" | "locked" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16" />
      <path d="M4 21h16" />
      <circle cx="14.5" cy="12.5" r="1.2" fill="currentColor" stroke="none" />
      {state === "open" && <path d="M19 4.5 15 6.5V5.2l4-2Z" fill="currentColor" stroke="none" />}
      {state === "locked" && (
        <>
          <rect x="10.7" y="10.5" width="2.6" height="2.6" rx="0.5" fill="currentColor" stroke="none" />
          <path d="M12 13v2" />
        </>
      )}
    </svg>
  )
}

/** Верен ли ответ на станции (по типу). Чистая функция — для ad-hoc проверок. */
export function checkStationAnswer(
  station: EscapeRoomStation,
  selected: string | null,
  transcript: string,
  declared: boolean,
): boolean {
  const d = station.data
  switch (station.type) {
    case "fill-gap":
    case "fix-mistake":
    case "make-question":
    case "full-answer": {
      if (typeof selected !== "string" || typeof d.answer !== "string") return false
      return selected.trim().toLowerCase() === d.answer.trim().toLowerCase()
    }
    case "code-phrase": {
      if (declared) return true
      const words = (d.keywords || [])
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean)
      if (words.length === 0) return false
      const lower = transcript.toLowerCase()
      return words.every(
        (w) =>
          (() => {
            try {
              return new RegExp(`\\b${escapeRegex(w)}\\b`).test(lower)
            } catch {
              return lower.includes(w)
            }
          })(),
      )
    }
  }
}

export function EscapeRoomTask({ title, description, stations, onComplete, levelFlow }: EscapeRoomTaskProps) {
  const { say } = useVerbBot()
  const { play } = useSound()
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [declared, setDeclared] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [checked, setChecked] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [score, setScore] = useState(0)
  const [finalPhase, setFinalPhase] = useState(false)
  const [finished, setFinished] = useState(false)
  const [reaction, setReaction] = useState<{ key: number; correct: boolean } | null>(null)

  // Push-to-talk (как в OneMinuteTask/VoiceChatTask): распознанная фраза
  // кладётся в transcript; станция засчитывается по ключевым словам.
  const { listening, supported, error, start, stop } = useSpeechRecognition({
    onResult: (text) => {
      setTranscript((prev) => (prev ? `${prev} ${text}` : text))
    },
  })

  if (!stations || stations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <p className="text-slate-500">Нет данных для отображения</p>
      </div>
    )
  }

  const station = stations[current]
  if (!station) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <p className="text-slate-500">Ошибка: задание пустое</p>
      </div>
    )
  }

  const total = stations.length
  const d = station.data
  const isChoice = station.type !== "code-phrase"
  const isCodePhrase = station.type === "code-phrase"
  const hasAnswer = isCodePhrase ? transcript.trim().length > 0 || declared : selected !== null

  // Клик по варианту/«Произнёс» только ВЫБИРАЕТ ответ — проверка отложена до
  // кнопки «Проверить» (паттерн QuizTask после UX-пакета).
  const handleSelect = (option: string) => {
    if (checked) return
    setSelected(option)
  }

  const handleDeclare = () => {
    if (checked) return
    setDeclared(true)
  }

  const toggleMic = () => {
    if (checked) return
    if (listening) stop()
    else start()
  }

  // «Проверить»: вердикт станции (подсветка, звук, say, стикер), подсказка
  // hintFor при ошибке; дверь станции открывается.
  const handleCheck = () => {
    if (checked || !hasAnswer) return
    stop()
    const ok = checkStationAnswer(station, selected, transcript, declared)
    if (ok) setScore((s) => s + 1)
    setCorrect(ok)
    setChecked(true)
    say(ok ? "correct" : "wrong")
    play(ok ? "correct" : "wrong")
    setReaction({ key: current, correct: ok })
  }

  // «Далее» после вердикта: следующая станция (дверь уже открыта) или
  // финальный вердикт «N из 5» после последней.
  const handleNext = () => {
    setReaction(null)
    if (current + 1 < total) {
      const nextIndex = current + 1
      setCurrent(nextIndex)
      setSelected(null)
      setDeclared(false)
      setTranscript("")
      setChecked(false)
      setCorrect(false)
    } else {
      setFinalPhase(true)
    }
  }

  // Финальный вердикт → ResultScreen; onComplete(score, total) ровно один раз.
  const handleFinalNext = () => {
    setFinished(true)
    onComplete?.(score, total)
    say("finish")
    play("fanfare")
  }

  const retry = () => {
    stop()
    setCurrent(0)
    setSelected(null)
    setDeclared(false)
    setTranscript("")
    setChecked(false)
    setCorrect(false)
    setScore(0)
    setFinalPhase(false)
    setFinished(false)
    setReaction(null)
  }

  if (finished) {
    return (
      <ResultScreen title={title} score={score} total={total} onRetry={retry} taskType="escape-room" />
    )
  }

  // Подсказка hintFor под вердиктом неверного ответа (W1-T3, читай не меняй).
  const wrongHint =
    checked && !correct
      ? hintFor(station.type === "fill-gap" ? "fill-in" : station.type, d, selected ?? undefined)
      : null

  // Ряд дверей: открыта — станция пройдена; активная — текущая; закрыта — впереди.
  const doorState = (i: number): "open" | "active" | "locked" => {
    if (finalPhase) return "open"
    if (i < current) return "open"
    if (i === current) return checked ? "open" : "active"
    return "locked"
  }

  // Строка инструкции по типу станции (русский UI).
  const instruction = (() => {
    switch (station.type) {
      case "fill-gap":
        return "Вставь правильную форму глагола"
      case "fix-mistake":
        return "Найди и исправь ошибку"
      case "make-question":
        return "Составь вопрос"
      case "full-answer":
        return "Ответь полным предложением"
      case "code-phrase":
        return "Произнеси кодовую фразу"
    }
  })()

  // Предложение fix-mistake: ошибочное слово зачёркнуто (как шаг «Исправь»
  // в Grammar Detective), если в data есть wrong.
  const renderMistakeSentence = () => {
    const sentence = d.sentence || ""
    if (!d.wrong || !sentence) return <span>{sentence}</span>
    const idx = sentence.toLowerCase().indexOf(d.wrong.toLowerCase())
    if (idx === -1) return <span>{sentence}</span>
    return (
      <span>
        {sentence.slice(0, idx)}
        <s className="text-danger decoration-danger/70 decoration-2">{d.wrong}</s>
        {sentence.slice(idx + d.wrong.length)}
      </span>
    )
  }

  // Содержимое станции: предложение/вопрос + варианты (или микрофон для
  // кодовой фразы).
  const renderStationBody = () => {
    if (isCodePhrase) {
      return (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border-2 border-dashed border-primary-300 bg-primary-100/40 px-5 py-4 text-center">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-primary-500">
              Кодовая фраза
            </div>
            <div className="font-display text-2xl font-extrabold tracking-wide text-primary-900">
              {d.phrase}
            </div>
            {(d.keywords || []).length > 0 && (
              <div className="mt-2 text-xs text-slate-500">
                Скажи фразу вслух — дверь откроется по ключевым словам!
              </div>
            )}
          </div>

          {supported ? (
            <div className="flex flex-col items-center gap-2">
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
                  disabled={checked}
                  title={listening ? "Остановить запись" : "Нажми, чтобы говорить"}
                  aria-label={listening ? "Остановить запись" : "Произнести фразу"}
                  className={`flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-colors ${
                    listening
                      ? "bg-danger text-white"
                      : "bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40"
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 10.5v.5a7 7 0 0 0 14 0v-.5" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                  </svg>
                </motion.button>
              </div>
              <div className="min-h-[16px] text-xs text-slate-500">
                {listening ? "Слушаю… говори!" : "Нажми, чтобы говорить (push-to-talk)"}
              </div>
              <div className="w-full rounded-2xl border-2 border-dashed border-primary-200 bg-slate-50 p-3">
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Что я услышал
                </div>
                <p className="min-h-[20px] text-sm leading-relaxed text-slate-700">
                  {transcript || "—"}
                </p>
              </div>
              {error && <p className="text-center text-xs text-danger">{error}</p>}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
                🎤 Микрофон недоступен — просто скажи фразу вслух и нажми «Произнёс»:
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleDeclare}
                disabled={checked}
                className={`w-full min-h-[44px] rounded-2xl px-6 py-3 font-bold transition-colors ${
                  declared
                    ? "bg-success/15 border-2 border-success text-success"
                    : "bg-primary-600 text-white shadow-glow-primary hover:bg-primary-700 disabled:opacity-40"
                }`}
              >
                {declared ? "✓ Фраза произнесена" : "Произнёс"}
              </motion.button>
            </div>
          )}
        </div>
      )
    }

    return (
      <>
        {/* Текст станции: пропуск fill-gap / ошибка fix-mistake / слова и вопрос */}
        <div className="rounded-2xl border-2 border-primary-100 bg-white p-4 shadow-soft">
          {station.type === "fill-gap" && d.sentence && (
            <p className="text-center text-xl font-semibold leading-relaxed text-slate-800">
              {d.sentence.split("___").map((part, pi, arr) => (
                <span key={pi}>
                  {part}
                  {pi < arr.length - 1 && (
                    <span className="mx-1 inline-block min-w-[7ch] rounded-lg border-b-4 border-dashed border-primary-400 bg-primary-50 px-2 text-center text-primary-700">
                      {selected && checked ? (correct ? selected : d.answer) : selected ?? "…"}
                    </span>
                  )}
                </span>
              ))}
            </p>
          )}
          {station.type === "fix-mistake" && (
            <p className="text-center text-xl font-semibold leading-relaxed text-slate-800">
              {renderMistakeSentence()}
            </p>
          )}
          {station.type === "make-question" && (
            <div className="text-center">
              {d.prompt && (
                <p className="mb-2 text-sm text-slate-500">{d.prompt}</p>
              )}
              <p className="text-lg font-semibold text-slate-800">Выбери верный вопрос</p>
            </div>
          )}
          {station.type === "full-answer" && d.question && (
            <div className="text-center">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Вопрос</p>
              <p className="text-lg font-semibold leading-relaxed text-slate-800">{d.question}</p>
            </div>
          )}
        </div>

        {/* Варианты ответа (выбрал → «Проверить» → вердикт, паттерн QuizTask) */}
        <div className="relative grid grid-cols-1 gap-3">
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
          {(d.options || []).map((opt, oi) => {
            const isAnswer = typeof d.answer === "string" && opt === d.answer
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
      </>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-primary-900">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>

      {/* Прогресс дверей: 5 значков, открываются по мере прохождения */}
      <div className="flex items-center justify-center gap-2.5">
        {stations.map((_, i) => {
          const state = doorState(i)
          const colors =
            state === "open"
              ? "bg-success/15 border-success text-success"
              : state === "active"
                ? "bg-primary-100 border-primary-600 text-primary-700"
                : "bg-slate-100 border-slate-200 text-slate-400"
          return (
            <motion.div
              key={i}
              animate={state === "active" ? { scale: [1, 1.12, 1] } : {}}
              transition={state === "active" ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" } : {}}
              className={`flex h-11 w-11 items-center justify-center rounded-2xl border-2 ${colors}`}
              title={state === "open" ? `Дверь ${i + 1} открыта` : state === "active" ? `Станция ${i + 1}` : `Дверь ${i + 1} закрыта`}
            >
              <DoorIcon state={state} />
            </motion.div>
          )
        })}
      </div>

      {/* W3-T4 «Структура уровня»: лесенка этапов (levelFlow: true в JSON).
          Заполняется по мере прохождения станций: пройденные станции = этапы,
          финальный вердикт открывает «Награду» (последний этап). */}
      {levelFlow !== false && (
        <LevelFlow
          currentStep={
            finalPhase
              ? LEVEL_FLOW_STEPS.length
              : Math.min(current + (checked ? 1 : 0), stations.length)
          }
        />
      )}

      {/* Финальный вердикт N из 5 → «Далее» → ResultScreen */}
      <AnimatePresence mode="wait">
        {finalPhase ? (
          <motion.div
            key="final"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="relative rounded-2xl bg-white border-2 border-primary-100 p-6 text-center shadow-soft"
          >
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
            <div className="text-6xl">{score === total ? "🚪✨" : score >= Math.ceil(total / 2) ? "🚪" : "🔒"}</div>
            <h3 className="mt-2 font-display text-2xl font-extrabold text-primary-900">
              {score === total ? "Все двери открыты!" : `Открыто дверей: ${score} из ${total}`}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {score === total
                ? "Verb Bot на свободе — отличная работа!"
                : score >= Math.ceil(total / 2)
                  ? "Лаборатория почти открыта! Повтори задание, чтобы открыть все двери."
                  : "Не все двери открылись. Попробуй ещё раз!"}
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleFinalNext}
              className="mt-4 w-full min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
            >
              Далее
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="flex flex-col gap-4"
          >
            {/* Шапка станции */}
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-400">
                Станция {current + 1} из {total}
              </div>
              <div className="rounded-full bg-grammar-100 px-3 py-1 text-xs font-bold text-grammar-700">
                {instruction}
              </div>
            </div>
            <h3 className="font-display text-xl font-extrabold text-primary-900">{station.title}</h3>

            {renderStationBody()}

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

            {/* Вердикт станции (после «Проверить») */}
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
                  {correct ? "🎉 Дверь открыта!" : "🚪 Дверь закрыта…"}
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA: «Проверить» (когда ответ выбран) → после вердикта «Далее» */}
            <div className="mt-1">
              {!checked ? (
                hasAnswer && (
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
                  {current + 1 < total ? "Далее →" : "Финальный вердикт →"}
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
