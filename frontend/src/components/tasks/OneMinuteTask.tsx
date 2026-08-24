"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useVerbBot } from "@/components/VerbBot"
import { useSound } from "@/lib/useSound"
import { ResultScreen } from "@/components/ResultScreen"
import { StickerReaction } from "@/components/StickerReaction"
import { useSpeechRecognition } from "@/lib/useSpeechRecognition"

/**
 * One-Minute Challenge (тикет W2-T1) — новый тип задания "one-minute".
 *
 * Тема из JSON → таймер 60 секунд (без наказания: истёк — просто стоп и
 * переход к проверке) → push-to-talk запись (useSpeechRecognition, как в
 * VoiceChatTask) → грамматические условия из JSON (conditions: {label, hint,
 * markers, min}) подсвечиваются НА ЛЕТУ по эвристике слов-маркеров →
 * «Проверить» → вердикт N из M → «Далее» → ResultScreen.
 * Начисление: onComplete(score, total) → saveTask с типом "one-minute"
 * (в SPEAKING_TASK_TYPES → награда 🗣 Communication).
 */

/** Одно грамматическое условие One-Minute Challenge (W2-T1). */
export interface OneMinuteCondition {
  /** Подпись по-русски, например «Используй 5 глаголов в Present Simple». */
  label: string
  /** Подсказка: примеры слов/фраз. */
  hint: string
  /** Слова-маркеры: условие выполнено, если в речи встретилось >= min из них. */
  markers: string[]
  /** Сколько маркеров нужно встретить (по умолчанию 1). */
  min?: number
}

interface OneMinuteTaskProps {
  title: string
  description: string
  topic: string
  duration?: number
  conditions: OneMinuteCondition[]
  /** Сценарий-текст (правки 12.08): описание ситуации + готовые предложения для чтения вслух. */
  script?: { description?: string; sentences?: string[] }
  largeText?: boolean
  alwaysPass?: boolean
  onComplete?: (score: number, total: number) => void
}

type Phase = "ready" | "speaking" | "checking" | "verdict" | "finished"

/** Экранирование regex-спецсимволов (маркеры ищем как целые слова). */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Эвристика: сколько маркеров условия встретилось в распознанном тексте. */
function markersMet(cond: OneMinuteCondition, text: string): number {
  if (!cond.markers || cond.markers.length === 0) return 0
  const lower = text.toLowerCase()
  let count = 0
  for (const marker of cond.markers) {
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

export function OneMinuteTask({
  title,
  description,
  topic,
  duration = 60,
  conditions,
  script,
  largeText = false,
  alwaysPass = false,
  onComplete,
}: OneMinuteTaskProps) {
  const { say } = useVerbBot()
  const { play } = useSound()
  const [phase, setPhase] = useState<Phase>("ready")
  const [timeLeft, setTimeLeft] = useState(duration)
  const [transcript, setTranscript] = useState("")
  const [textInput, setTextInput] = useState("")
  const [reaction, setReaction] = useState<{ key: number; correct: boolean } | null>(null)

  const total = conditions.length
  // Подсветка условий «на лету»: сколько условий уже выполнено по маркерам.
  const metCount = useMemo(
    () => conditions.filter((c) => markersMet(c, transcript) >= (c.min ?? 1)).length,
    [conditions, transcript],
  )

  // Push-to-talk (как в VoiceChatTask): распознанная фраза добавляется в текст.
  // pravki-240826 (тикет 02): autoRestart — в минутном монологе микрофон не
  // глохнет после каждой фразы («синтезатор отключается»), слушает до «Готово»
  // или конца таймера (они вызывают stop() и гасят флаг желания слушать).
  const { listening, supported, error, start, stop } = useSpeechRecognition({
    autoRestart: true,
    onResult: (text) => {
      if (phase !== "speaking") return
      setTranscript((prev) => (prev ? `${prev} ${text}` : text))
    },
  })

  // Таймер: обратный отсчёт с cleanup (размонтирование/смена фазы гасят интервал).
  useEffect(() => {
    if (phase !== "speaking") return
    const iv = setInterval(() => {
      setTimeLeft((t) => (t <= 1 ? 0 : t - 1))
    }, 1000)
    return () => clearInterval(iv)
  }, [phase])

  // Время истекло — просто стоп (без наказания) и переход к проверке.
  useEffect(() => {
    if (phase === "speaking" && timeLeft === 0) {
      stop()
      setPhase("checking")
    }
  }, [phase, timeLeft, stop])

  const appendText = (text: string) => {
    setTranscript((prev) => (prev ? `${prev} ${text}` : text))
  }

  const handleStart = () => {
    setTimeLeft(duration)
    setTranscript("")
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

  // «Проверить»: вердикт (сколько условий выполнено из N), звук, say, стикер.
  const handleCheck = () => {
    if (phase !== "checking") return
    stop()
    const correct = alwaysPass || metCount >= Math.ceil(total / 2)
    setReaction({ key: 1, correct })
    say(correct ? "correct" : "wrong")
    play(correct ? "correct" : "wrong")
    setPhase("verdict")
  }

  // G5 (правки 12.08): «Готово» — ученик проговорил раньше времени и не хочет
  // ждать окончания минуты. Завершает раунд СРАЗУ (таймер остаётся как
  // подсказка, авто-окончание по таймеру тоже работает).
  const handleDone = () => {
    if (phase !== "speaking") return
    stop()
    setPhase("checking")
  }

  // «Далее» после вердикта → ResultScreen; onComplete ровно один раз.
  const handleNext = () => {
    if (phase !== "verdict") return
    setPhase("finished")
    onComplete?.(alwaysPass ? total : metCount, total)
    say("finish")
    play("fanfare")
  }

  const retry = () => {
    stop()
    setPhase("ready")
    setTimeLeft(duration)
    setTranscript("")
    setTextInput("")
    setReaction(null)
  }

  if (phase === "finished") {
    return (
      <ResultScreen title={title} score={metCount} total={total} onRetry={retry} taskType="one-minute" />
    )
  }

  if (!conditions || conditions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <p className="text-slate-500">Нет данных для отображения</p>
      </div>
    )
  }

  const timerDanger = timeLeft <= 10 && (phase === "speaking" || phase === "checking")
  const metPct = total > 0 ? Math.round((metCount / total) * 100) : 0
  const verdictGood = metCount >= Math.ceil(total / 2)

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">
      <h2 className={`font-display font-extrabold tracking-tight text-primary-900 ${largeText ? "text-3xl" : "text-2xl"}`}>{title}</h2>
      <p className={largeText ? "text-base text-slate-600" : "text-sm text-slate-500"}>{description}</p>

      {/* Сценарий-текст (правки 12.08): что читать вслух — крупным шрифтом (G6) */}
      {script && (script.description || (script.sentences && script.sentences.length > 0)) && (
        <div className="rounded-2xl border-2 border-primary-200 bg-primary-50/60 p-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-primary-500">
            📖 Сценарий — прочитай вслух
          </div>
          {script.description && (
            <p className="mb-3 text-sm font-medium leading-relaxed text-slate-600">{script.description}</p>
          )}
          {script.sentences && script.sentences.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {script.sentences.map((s, i) => (
                <li key={i} className="font-display text-lg font-bold leading-snug text-primary-900">
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Тема из JSON */}
      {topic && (
        <div className="flex items-center gap-2.5 rounded-2xl border-2 border-primary-200 bg-primary-100/60 px-4 py-3">
          <span className="text-xl" aria-hidden>
            🗣️
          </span>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-primary-500">Тема</div>
            <div className="font-display text-lg font-extrabold text-primary-900">{topic}</div>
          </div>
        </div>
      )}

      {/* Таймер 60 секунд */}
      <div className="rounded-2xl bg-white border-2 border-primary-100 p-4 text-center shadow-soft">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          {phase === "ready"
            ? "Время на рассказ"
            : phase === "speaking"
              ? "Осталось"
              : "Готово! Проверяем…"}
        </div>
        <motion.div
          animate={timerDanger ? { scale: [1, 1.06, 1] } : {}}
          transition={timerDanger ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" } : {}}
          className={`font-display text-6xl font-black tabular-nums ${
            timerDanger ? "text-danger" : "text-primary-800"
          }`}
        >
          {timeLeft}
          <span className="ml-1 text-xl font-bold text-slate-400">сек</span>
        </motion.div>
        {phase === "speaking" && (
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-speaking-400"
              animate={{ width: `${(timeLeft / Math.max(1, duration)) * 100}%` }}
              transition={{ ease: "linear", duration: 0.4 }}
            />
          </div>
        )}
      </div>

      {/* Грамматические условия */}
      <div className="rounded-2xl bg-white border-2 border-primary-100 p-4 shadow-soft">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-base font-extrabold text-primary-900">🎯 Грамматические условия</h3>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              metCount === total ? "bg-success/10 text-success" : "bg-primary-100 text-primary-700"
            }`}
          >
            {metCount} из {total}
          </span>
        </div>
        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-success to-speaking-400"
            animate={{ width: `${metPct}%` }}
            transition={{ type: "spring", stiffness: 150, damping: 22 }}
          />
        </div>
        <ul className="space-y-2">
          {conditions.map((c, i) => {
            const met = markersMet(c, transcript) >= (c.min ?? 1)
            const showVerdict = phase === "verdict"
            return (
              <li
                key={i}
                className={`flex items-start gap-2.5 rounded-2xl border-2 px-3 py-2 transition-colors ${
                  showVerdict && !met
                    ? "border-danger/40 bg-danger/5"
                    : met
                      ? "border-success/50 bg-success/5"
                      : "border-primary-100 bg-white"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                    met ? "bg-success text-white" : showVerdict ? "bg-danger text-white" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {met ? "✓" : showVerdict ? "✗" : i + 1}
                </span>
                <div className="flex-1">
                  <div className={`text-sm font-bold ${met ? "text-success" : "text-slate-700"}`}>{c.label}</div>
                  <div className="text-xs text-slate-400">{c.hint}</div>
                </div>
                {phase !== "ready" && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      met ? "bg-success/10 text-success" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {markersMet(c, transcript)}/{c.min ?? 1}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {/* Транскрипт речи */}
      {(phase === "speaking" || phase === "checking") && (
        <div className="rounded-2xl border-2 border-dashed border-primary-200 bg-slate-50 p-3">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Твой ответ</div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {transcript || "Нажми «Говорить» и расскажи о теме — условия будут подсвечиваться сами!"}
          </p>
        </div>
      )}

      {/* Речь (push-to-talk) или текстовый фолбэк */}
      {(phase === "speaking" || phase === "checking") && (
        <div className="flex flex-col items-center gap-3">
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
                  disabled={phase !== "speaking"}
                  title={listening ? "Остановить запись" : "Нажми, чтобы говорить"}
                  aria-label={listening ? "Остановить запись" : "Говорить"}
                  className={`flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-colors ${
                    listening
                      ? "bg-danger text-white"
                      : phase === "speaking"
                        ? "bg-primary-600 text-white hover:bg-primary-700"
                        : "bg-slate-300 text-slate-500"
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
                {listening ? "Слушаю… говори!" : phase === "speaking" ? "Нажми, чтобы говорить (push-to-talk)" : "Микрофон выключен"}
              </div>
            </>
          ) : (
            <div className="flex w-full flex-col gap-2">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
                🎤 Голосовая запись доступна в Chrome или Edge. Можно написать ответ текстом:
              </div>
              <div className="flex w-full gap-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddText()}
                  placeholder="Напиши предложение по-английски..."
                  disabled={phase !== "speaking"}
                  className="min-h-[48px] flex-1 rounded-xl border-2 border-primary-200 px-4 py-3 text-base outline-none focus:border-primary-500 disabled:opacity-50"
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddText}
                  disabled={phase !== "speaking" || !textInput.trim()}
                  className="rounded-xl bg-primary-600 px-5 py-3 font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Добавить
                </motion.button>
              </div>
            </div>
          )}
          {error && <p className="text-center text-xs text-danger">{error}</p>}
        </div>
      )}

      {/* Вердикт: сколько условий выполнено из N + «Далее» */}
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
                  text={reaction.correct ? `+${metCount} 🗣` : undefined}
                  className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                />
              )}
            </AnimatePresence>
            <div className="text-center">
              <div className="text-6xl">{verdictGood ? "🎉" : "💪"}</div>
              <h3 className="mt-2 font-display text-2xl font-extrabold text-primary-900">
                Выполнено {metCount} из {total}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {metCount === total
                  ? "Все условия выполнены — отличная речь!"
                  : verdictGood
                    ? "Хорошая работа! Ещё чуть-чуть — и всё получится."
                    : "Попробуй ещё раз — говори больше и следи за условиями!"}
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

      {/* CTA */}
      {phase === "ready" && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleStart}
          className="w-full min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
        >
          🚀 Начать говорить
        </motion.button>
      )}
      {/* G5 (правки 12.08): «Готово» — завершает раунд сразу, не ждёт таймер. */}
      {phase === "speaking" && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleDone}
          className="w-full min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
        >
          ✅ Готово
        </motion.button>
      )}
      {phase === "checking" && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleCheck}
          className="w-full min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
        >
          Проверить
        </motion.button>
      )}
    </div>
  )
}
