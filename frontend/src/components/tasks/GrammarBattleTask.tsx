"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useVerbBot } from "@/components/VerbBot"
import { useSound } from "@/lib/useSound"
import { ResultScreen } from "@/components/ResultScreen"
import { StickerReaction } from "@/components/StickerReaction"

/**
 * Grammar Battle (тикет W3-T2) — новый тип задания "grammar-battle".
 *
 * Быстрая сборка предложений на время (спека 6 «Grammar Battle»): 3 раунда
 * из JSON rounds[] — каждому раунду слово-стимул (например «play / now») и
 * тип предложения (mode: positive | negative | question). Ученик собирает
 * предложение из слов-плиток (тап в правильном порядке, кнопка «Сбросить»),
 * пока идёт таймер раунда (timeSec, дефолт 20 с). Таймер без наказания:
 * истёк — «Время вышло!» (очко просто не начисляется) → «Далее». Вердикт по
 * каждому раунду (верно/неверно + правильный ответ) → финальный «N из 3» →
 * ResultScreen. Начисление: тип НЕ в SPEAKING_TASK_TYPES → ⚡ Energy.
 *
 * Раунд — отдельный подкомпонент RoundView с key={current}: state раунда
 * (банк плиток, собранная строка, таймер) рождается на монте и умирает на
 * advance — таймер не может «протечь» из предыдущего раунда (cleanup
 * setInterval, паттерн ClozeTextTask RoundView).
 */

/** Тип предложения в раунде Grammar Battle (W3-T2). */
export type GrammarBattleMode = "positive" | "negative" | "question"

/** Один раунд Grammar Battle: стимул + тип + слова-плитки + ответ. */
export interface GrammarBattleRound {
  /** Слово-стимул, например «play / now» (что строим). */
  stimulus: string
  /** Тип предложения: утверждение / отрицание / вопрос. */
  mode: GrammarBattleMode
  /** Слова-плитки в ПРАВИЛЬНОМ порядке (банк перемешивается в UI). */
  words: string[]
  /** Правильное предложение = words.join(" ") (сравнение без регистра). */
  answer: string
  /** Таймер раунда в секундах (по умолчанию 20). */
  timeSec?: number
}

interface GrammarBattleTaskProps {
  title: string
  description: string
  rounds: GrammarBattleRound[]
  onComplete?: (score: number, total: number) => void
}

const DEFAULT_TIME_SEC = 20

const MODE_LABEL: Record<GrammarBattleMode, string> = {
  positive: "Утверждение",
  negative: "Отрицание",
  question: "Вопрос",
}

const MODE_CHIP: Record<GrammarBattleMode, string> = {
  positive: "bg-success/10 text-success border-success/40",
  negative: "bg-danger/10 text-danger border-danger/40",
  question: "bg-primary-100 text-primary-700 border-primary-300",
}

/** Перемешать слова-плитки для банка (как DragAndDropTask). */
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

export function GrammarBattleTask({
  title,
  description,
  rounds,
  onComplete,
}: GrammarBattleTaskProps) {
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [finalPhase, setFinalPhase] = useState(false)
  const [finished, setFinished] = useState(false)
  const { say } = useVerbBot()
  const { play } = useSound()

  if (!rounds || rounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <p className="text-slate-500">Нет данных для отображения</p>
      </div>
    )
  }

  const total = rounds.length

  // Раунд пройден (после «Проверить»): +1 очко за верный ответ.
  // Таймаут очко НЕ начисляет и НЕ снимает («без наказания»).
  const handleRoundResult = (correct: boolean) => {
    if (correct) setScore((s) => s + 1)
  }

  // «Далее» после вердикта последнего раунда → финальный вердикт «N из 3».
  const handleRoundNext = () => {
    if (current + 1 < total) {
      setCurrent(current + 1)
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
    setCurrent(0)
    setScore(0)
    setFinalPhase(false)
    setFinished(false)
  }

  if (finished) {
    return (
      <ResultScreen title={title} score={score} total={total} onRetry={retry} taskType="grammar-battle" />
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-primary-900">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-grammar-400"
          animate={{ width: `${((current + 1) / total) * 100}%` }}
          transition={{ type: "spring", stiffness: 150, damping: 22 }}
        />
      </div>

      <AnimatePresence mode="wait">
        {finalPhase ? (
          <motion.div
            key="final"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="relative rounded-2xl bg-white border-2 border-primary-100 p-6 text-center shadow-soft"
          >
            <div className="text-6xl">{score === total ? "🏆" : score >= Math.ceil(total / 2) ? "⚔️" : "💪"}</div>
            <h3 className="mt-2 font-display text-2xl font-extrabold text-primary-900">
              {score === total ? "Идеальная битва!" : "Битва окончена!"}
            </h3>
            <p className="mt-1 font-display-alt text-3xl font-black text-primary-700">
              {score} из {total}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {score === total
                ? "Все раунды — молниеносно и точно!"
                : score >= Math.ceil(total / 2)
                  ? "Неплохо! Ещё чуть-чуть — и все раунды твои."
                  : "Попробуй ещё раз — скорость приходит с тренировкой!"}
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
          >
            <RoundView
              round={rounds[current]}
              roundIndex={current}
              total={total}
              onResult={handleRoundResult}
              onNext={handleRoundNext}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Один раунд: стимул + таймер + сборка из плиток + вердикт + «Далее». */
function RoundView({
  round,
  roundIndex,
  total,
  onResult,
  onNext,
}: {
  round: GrammarBattleRound
  roundIndex: number
  total: number
  onResult: (correct: boolean) => void
  onNext: () => void
}) {
  const { say } = useVerbBot()
  const { play } = useSound()

  // Банк плиток перемешан; собранная строка — пустая. State живёт ровно
  // один раунд (компонент ремаунтится через key={current}).
  const [bank, setBank] = useState<string[]>(() => shuffle(round.words))
  const [built, setBuilt] = useState<string[]>([])
  const [timeLeft, setTimeLeft] = useState<number>(round.timeSec ?? DEFAULT_TIME_SEC)
  const [checked, setChecked] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [reaction, setReaction] = useState<{ key: number; correct: boolean } | null>(null)

  const roundSec = round.timeSec ?? DEFAULT_TIME_SEC
  const canCheck = built.length === round.words.length

  // Таймер раунда: setInterval с cleanup. Останавливается после вердикта
  // (checked) — истёк или нет, переход дальше только кнопкой «Далее».
  useEffect(() => {
    if (checked) return
    const id = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [checked])

  // Время вышло → вердикт «Время вышло!» без наказания: очко не начисляется
  // (onResult не зовём), но и не снимается; показываем правильный ответ.
  useEffect(() => {
    if (timeLeft > 0 || checked) return
    setTimedOut(true)
    setChecked(true)
    setCorrect(false)
    say("wrong")
    play("wrong")
    setReaction({ key: roundIndex, correct: false })
  }, [timeLeft, checked, roundIndex, say, play])

  // Тап по плитке банка → добавить слово в конец собранной строки.
  const handlePick = (bankIndex: number) => {
    if (checked) return
    const word = bank[bankIndex]
    setBuilt((prev) => [...prev, word])
    setBank((prev) => prev.filter((_, i) => i !== bankIndex))
  }

  // Тап по слову собранной строки → вернуть его в банк.
  const handleUnpick = (builtIndex: number) => {
    if (checked) return
    const word = built[builtIndex]
    setBuilt((prev) => prev.filter((_, i) => i !== builtIndex))
    setBank((prev) => [...prev, word])
  }

  const handleReset = () => {
    if (checked) return
    setBuilt([])
    setBank(shuffle(round.words))
  }

  // «Проверить»: сравнение собранной строки с ответом (без регистра/пробелов).
  const handleCheck = () => {
    if (checked || !canCheck) return
    const ok = built.join(" ").trim().toLowerCase() === round.answer.trim().toLowerCase()
    setCorrect(ok)
    setChecked(true)
    if (ok) onResult(true)
    say(ok ? "correct" : "wrong")
    play(ok ? "correct" : "wrong")
    setReaction({ key: roundIndex, correct: ok })
  }

  const isLast = roundIndex + 1 === total

  return (
    <div className="flex flex-col gap-4">
      {/* Шапка раунда: счётчик + тип предложения */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-slate-400">
          Раунд {roundIndex + 1} из {total}
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs font-bold ${MODE_CHIP[round.mode]}`}>
          {MODE_LABEL[round.mode]}
        </div>
      </div>

      {/* Стимул: что собираем */}
      <div className="rounded-2xl border-2 border-grammar-100 bg-white p-5 text-center shadow-soft">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-grammar-500">
          Собери предложение
        </div>
        <div className="font-display text-2xl font-extrabold tracking-wide text-primary-900">
          {round.stimulus}
        </div>
      </div>

      {/* Таймер раунда: секунды + полоска (краснеет на последних 5 секундах) */}
      <div className="flex items-center gap-3">
        <div
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-black ${
            checked
              ? "bg-slate-100 text-slate-400"
              : timeLeft <= 5
                ? "bg-danger/10 text-danger"
                : "bg-primary-100 text-primary-700"
          }`}
        >
          ⏱ {timeLeft} с
        </div>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className={`h-full rounded-full ${checked ? "bg-slate-300" : timeLeft <= 5 ? "bg-danger" : "bg-primary-500"}`}
            animate={{ width: `${(timeLeft / roundSec) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Собранная строка: слова в порядке тапов (клик по слову — убрать) */}
      <div
        className={`flex min-h-[64px] flex-wrap items-center justify-center gap-2 rounded-2xl border-2 px-4 py-5 transition-colors ${
          checked
            ? correct
              ? "border-success bg-success/5"
              : "border-danger bg-danger/5"
            : "border-dashed border-primary-200 bg-white/70"
        }`}
      >
        {built.length === 0 ? (
          <span className="text-sm text-slate-400">Нажимай на слова в правильном порядке…</span>
        ) : (
          built.map((word, bi) => (
            <motion.button
              key={`built-${bi}`}
              layout
              whileTap={{ scale: 0.95 }}
              onClick={() => handleUnpick(bi)}
              disabled={checked}
              className={`rounded-xl px-3 py-2 text-base font-bold transition-colors ${
                checked
                  ? correct
                    ? "bg-success/15 text-success"
                    : "bg-danger/10 text-danger"
                  : "bg-primary-100 text-primary-800 hover:bg-primary-200 disabled:opacity-60"
              }`}
            >
              {word}
            </motion.button>
          ))
        )}
      </div>

      {/* Вердикт раунда (после «Проверить» или таймаута) */}
      <AnimatePresence>
        {checked && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-2xl px-4 py-3 text-center font-display text-lg font-extrabold ${
              correct
                ? "bg-success/10 text-success"
                : timedOut
                  ? "bg-amber-100 text-amber-800"
                  : "bg-danger/10 text-danger"
            }`}
          >
            {correct
              ? "🎉 Правильно!"
              : timedOut
                ? `⏱ Время вышло! Ответ: ${round.answer}`
                : `✗ Неверно. Ответ: ${round.answer}`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Банк плиток */}
      <div className="relative">
        <AnimatePresence>
          {reaction && reaction.key === roundIndex && (
            <StickerReaction
              key={reaction.key}
              id={reaction.correct ? "fire" : "oops"}
              text={reaction.correct ? "+1 ⚡" : undefined}
              className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            />
          )}
        </AnimatePresence>
        <div className="flex flex-wrap justify-center gap-2">
          {bank.map((word, bi) => (
            <motion.button
              key={`bank-${bi}`}
              layout
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePick(bi)}
              disabled={checked}
              className="rounded-full bg-white border-2 border-primary-200 px-4 py-2 text-base font-semibold text-slate-800 transition-colors hover:border-primary-400 hover:bg-primary-50 disabled:opacity-40"
            >
              {word}
            </motion.button>
          ))}
        </div>
      </div>

      {/* CTA: «Сбросить» (если что-то собрано) + «Проверить» → после вердикта «Далее» */}
      <div className="mt-1 flex flex-col gap-2">
        {!checked && built.length > 0 && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleReset}
            className="w-full min-h-[44px] rounded-2xl border-2 border-primary-200 bg-white px-6 py-2.5 font-bold text-primary-700 transition-colors hover:bg-primary-50"
          >
            Сбросить
          </motion.button>
        )}
        {!checked ? (
          canCheck && (
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
            onClick={onNext}
            className="w-full min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
          >
            {isLast ? "Итоги →" : "Далее →"}
          </motion.button>
        )}
      </div>
    </div>
  )
}
