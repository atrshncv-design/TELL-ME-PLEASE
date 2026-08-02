"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSound } from "@/lib/useSound"
import { ResultScreen } from "@/components/ResultScreen"

interface BuildSentenceTaskProps {
  title: string
  description: string
  adverbs: string[]
  timePhrases: string[]
  baseVerb: string // "play games"
  subject: string // "I"
  onComplete?: (score: number, total: number) => void
}

interface Round {
  adverb: string
  timePhrase: string
}

export function BuildSentenceTask({
  title,
  description,
  adverbs,
  timePhrases,
  baseVerb,
  subject,
  onComplete,
}: BuildSentenceTaskProps) {
  // Build rounds: every adverb × every time phrase, cycled deterministically.
  const rounds: Round[] = buildRounds(adverbs, timePhrases)

  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [placedAdverb, setPlacedAdverb] = useState<string | null>(null)
  const [placedTime, setPlacedTime] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [finished, setFinished] = useState(false)
  const { play } = useSound()

  if (rounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <p className="text-slate-500">Нет данных для отображения</p>
      </div>
    )
  }

  const round = rounds[current]

  // Which bank chips are still available (not placed in a slot)?
  const bankAdverbs = adverbs.filter((a) => a !== placedAdverb)
  const bankTimes = timePhrases.filter((t) => t !== placedTime)

  const canCheck = placedAdverb !== null && placedTime !== null

  const handleSelectAdverb = (a: string) => {
    if (showResult) return
    setPlacedAdverb((prev) => (prev === a ? null : a))
  }
  const handleSelectTime = (t: string) => {
    if (showResult) return
    setPlacedTime((prev) => (prev === t ? null : t))
  }

  const handleCheck = () => {
    if (!canCheck || showResult) return
    const correct =
      placedAdverb === round.adverb && placedTime === round.timePhrase
    setIsCorrect(correct)
    if (correct) setScore((s) => s + 1)
    setShowResult(true)
    play(correct ? "correct" : "wrong")

    setTimeout(() => {
      if (current + 1 < rounds.length) {
        setCurrent((c) => c + 1)
        setPlacedAdverb(null)
        setPlacedTime(null)
        setShowResult(false)
      } else {
        setFinished(true)
        play("fanfare")
        onComplete?.(correct ? score + 1 : score, rounds.length)
      }
    }, 1400)
  }

  const retry = () => {
    setCurrent(0)
    setScore(0)
    setPlacedAdverb(null)
    setPlacedTime(null)
    setShowResult(false)
    setIsCorrect(false)
    setFinished(false)
  }

  if (finished) {
    return <ResultScreen title={title} score={score} total={rounds.length} onRetry={retry} />
  }

  const target = `${subject} ${round.adverb} ${baseVerb} ${round.timePhrase}`

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-indigo-900">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>

      <div className="text-xs text-slate-400">
        Предложение {current + 1} из {rounds.length}
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <motion.div
          className="bg-indigo-500 h-2 rounded-full"
          animate={{ width: `${((current + 1) / rounds.length) * 100}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -30, opacity: 0 }}
          className="flex flex-col gap-4 py-2"
        >
          {/* Assembly line */}
          <div className="flex flex-wrap items-center justify-center gap-2 bg-white/70 rounded-2xl px-4 py-5 border-2 border-indigo-100">
            <span className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-800 font-semibold text-lg">
              {subject}
            </span>

            <Slot
              word={placedAdverb}
              placeholder="наречие"
              tone="violet"
              showResult={showResult}
              isCorrect={placedAdverb === round.adverb}
              onClear={() => !showResult && setPlacedAdverb(null)}
            />

            <span className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-800 font-semibold text-lg">
              {baseVerb}
            </span>

            <Slot
              word={placedTime}
              placeholder="время"
              tone="sky"
              showResult={showResult}
              isCorrect={placedTime === round.timePhrase}
              onClear={() => !showResult && setPlacedTime(null)}
            />
          </div>

          {/* Result / correct-answer banner */}
          <AnimatePresence>
            {showResult && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`text-center py-3 rounded-xl text-base font-semibold ${
                  isCorrect
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {isCorrect ? "✓ Правильно!" : `✗ Неверно. Ответ: ${target}`}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Word bank */}
          {!showResult && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap justify-center gap-2">
                {bankAdverbs.map((a) => (
                  <motion.button
                    key={`adv-${a}`}
                    layout
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelectAdverb(a)}
                    disabled={placedAdverb !== null}
                    className="px-3 py-2 rounded-full bg-violet-100 border-2 border-violet-200 text-violet-800 font-semibold text-base hover:border-violet-400 transition-colors disabled:opacity-40"
                  >
                    {a}
                  </motion.button>
                ))}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {bankTimes.map((t) => (
                  <motion.button
                    key={`time-${t}`}
                    layout
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelectTime(t)}
                    disabled={placedTime !== null}
                    className="px-3 py-2 rounded-full bg-sky-100 border-2 border-sky-200 text-sky-800 font-semibold text-base hover:border-sky-400 transition-colors disabled:opacity-40"
                  >
                    {t}
                  </motion.button>
                ))}
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleCheck}
                disabled={!canCheck}
                className="mt-1 px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Проверить
              </motion.button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/** A slot in the assembly line. Shows placeholder or the placed (clickable-to-remove) chip. */
function Slot({
  word,
  placeholder,
  tone,
  showResult,
  isCorrect,
  onClear,
}: {
  word: string | null
  placeholder: string
  tone: "violet" | "sky"
  showResult: boolean
  isCorrect: boolean
  onClear: () => void
}) {
  const toneEmpty =
    tone === "violet"
      ? "border-dashed border-violet-300 text-violet-300"
      : "border-dashed border-sky-300 text-sky-300"
  const toneFilled =
    tone === "violet"
      ? "bg-violet-100 text-violet-800"
      : "bg-sky-100 text-sky-800"

  let stateClass = toneFilled
  if (showResult) {
    stateClass = isCorrect
      ? "bg-green-100 text-green-700"
      : "bg-red-100 text-red-700"
  }

  return (
    <motion.button
      layout
      whileTap={{ scale: 0.95 }}
      onClick={onClear}
      disabled={word === null || showResult}
      className={`min-w-[96px] px-3 py-2 rounded-lg border-2 text-base font-semibold transition-colors ${
        word === null
          ? toneEmpty
          : stateClass
      }`}
    >
      {word ?? placeholder}
    </motion.button>
  )
}

/** Deterministically pair every adverb with a cycled time phrase (all 6 adverbs first). */
function buildRounds(adverbs: string[], timePhrases: string[]): Round[] {
  if (adverbs.length === 0 || timePhrases.length === 0) return []
  return adverbs.map((adverb, i) => ({
    adverb,
    timePhrase: timePhrases[i % timePhrases.length],
  }))
}
