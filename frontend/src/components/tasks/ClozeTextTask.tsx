"use client"

import { useState, useMemo, useCallback } from "react"
import { useVerbBot } from "@/components/VerbBot"
import { useSound } from "@/lib/useSound"
import { motion, AnimatePresence } from "framer-motion"
import { ResultScreen } from "@/components/ResultScreen"

/**
 * ClozeTextTask — unified "two-click cloze" mechanic (decision Q5/Q6).
 *
 * Flow: click a blank → click a word from the bank to fill it. Click a filled
 * blank to return its word to the bank. One-shot "Проверить" checks every blank
 * (case-insensitive trim), shows green ✓ / red ✗ with the correct answer, then
 * either advances to the next round (multi-round) or shows the finished screen.
 *
 * Two shapes:
 *   - single round: pass `text`, `answers`, `wordBank` (+ optional hints/underlineWords)
 *   - multi round:  pass `rounds[]` (each { text, answers, wordBank, hints? })
 *
 * Duplicate word-bank entries are supported: each chip is a discrete token
 * tracked by index, not by word uniqueness.
 */

interface ClozeRound {
  text: string
  answers: string[][]
  wordBank: string[]
  hints?: string[]
}

interface ClozeTextTaskProps {
  title: string
  description: string
  /** Single-round shape. */
  text?: string
  answers?: string[][]
  wordBank?: string[]
  hints?: string[]
  underlineWords?: string[]
  /** Multi-round shape. */
  rounds?: ClozeRound[]
  onComplete?: (score: number, total: number) => void
}

/** Split `text` on `___` into alternating [segment, blank, segment, blank, ...]. */
function parseText(text: string): string[] {
  return text.split("___")
}

/** Deterministic Fisher–Yates shuffle seeded by round index (stable per round). */
function shuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr]
  let s = seed * 9301 + 49297
  const rand = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function ClozeTextTask({
  title,
  description,
  text,
  answers,
  wordBank,
  hints,
  underlineWords,
  rounds,
  onComplete,
}: ClozeTextTaskProps) {
  // Normalize to a rounds[] view so single-round and multi-round share one path.
  const effectiveRounds: ClozeRound[] = useMemo(() => {
    if (rounds && rounds.length > 0) return rounds
    if (text && answers && wordBank) {
      return [{ text, answers, wordBank, hints }]
    }
    return []
  }, [rounds, text, answers, wordBank, hints])

  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  // Инкрементится при «Ещё раз», чтобы пересоздать RoundView и сбросить его
  // внутреннее состояние (placements/checked) даже для одного раунда.
  const [resetToken, setResetToken] = useState(0)
  const { play } = useSound()

  if (effectiveRounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <p className="text-slate-500">Нет данных для отображения</p>
      </div>
    )
  }

  const totalRounds = effectiveRounds.length
  const isMulti = totalRounds > 1

  const handleRoundScored = (roundScore: number) => {
    const newScore = score + roundScore
    setScore(newScore)
    if (current + 1 < totalRounds) {
      setCurrent((c) => c + 1)
    } else {
      setFinished(true)
      play("fanfare")
      // Score is total correct blanks across all rounds; total is sum of blanks.
      const totalBlanks = effectiveRounds.reduce((sum, r) => sum + r.answers.length, 0)
      onComplete?.(newScore, totalBlanks)
    }
  }

  const retry = () => {
    setCurrent(0)
    setScore(0)
    setFinished(false)
    // Новый ключ пересоздаёт RoundView — сбрасывает placements/checked раунда.
    setResetToken((t) => t + 1)
  }

  if (finished) {
    const totalBlanks = effectiveRounds.reduce((sum, r) => sum + r.answers.length, 0)
    return <ResultScreen title={title} score={score} total={totalBlanks} onRetry={retry} />
  }

  const round = effectiveRounds[current]

  return (
    <RoundView
      key={`${resetToken}-${current}`}
      round={round}
      roundIndex={current}
      title={title}
      description={description}
      underlineWords={underlineWords}
      isMulti={isMulti}
      current={current}
      totalRounds={totalRounds}
      onScored={handleRoundScored}
    />
  )
}

/** Renders a single round: the text with blanks + the word bank. */
function RoundView({
  round,
  roundIndex,
  title,
  description,
  underlineWords,
  isMulti,
  current,
  totalRounds,
  onScored,
}: {
  round: ClozeRound
  roundIndex: number
  title: string
  description: string
  underlineWords?: string[]
  isMulti: boolean
  current: number
  totalRounds: number
  onScored: (roundScore: number) => void
}) {
  const segments = useMemo(() => parseText(round.text), [round.text])
  const blankCount = segments.length - 1

  // Shuffled bank chips (stable per round via seeded shuffle).
  const chips = useMemo(
    () =>
      shuffle(
        round.wordBank.map((word, i) => ({ id: `${roundIndex}-${i}`, word })),
        roundIndex + 1,
      ),
    [round.wordBank, roundIndex],
  )

  // placements[blankIndex] = chipId | null. Which chip fills each blank.
  const [placements, setPlacements] = useState<(string | null)[]>(() =>
    Array.from({ length: Math.max(blankCount, 0) }, () => null),
  )
  const [activeBlank, setActiveBlank] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const { say } = useVerbBot()
  const { play } = useSound()

  // Per-blank correctness (only meaningful after check).
  const results = useMemo(() => {
    if (!checked) return []
    return round.answers.map((acceptable, i) => {
      const chipId = placements[i]
      if (!chipId) return { correct: false, placed: undefined, answer: acceptable[0] ?? "?" }
      const placedWord = chips.find((c) => c.id === chipId)?.word ?? ""
      const correct = acceptable.some(
        (a) => a.trim().toLowerCase() === placedWord.trim().toLowerCase(),
      )
      return { correct, placed: placedWord, answer: acceptable[0] ?? "?" }
    })
  }, [checked, placements, round.answers, chips])

  const placedChipIds = new Set(placements.filter((p): p is string => p !== null))
  const allFilled = placements.every((p) => p !== null)

  const selectBlank = useCallback(
    (i: number) => {
      if (checked) return
      // Clicking a filled blank returns its word to the bank and reactivates it.
      if (placements[i] !== null) {
        setPlacements((prev) => {
          const next = [...prev]
          next[i] = null
          return next
        })
      }
      setActiveBlank(i)
    },
    [checked, placements],
  )

  const selectChip = useCallback(
    (chipId: string) => {
      if (checked) return
      if (activeBlank === null) return // require explicit blank selection (Q5)
      setPlacements((prev) => {
        const next = [...prev]
        // If this chip was already placed elsewhere, remove it from there first.
        for (let k = 0; k < next.length; k++) {
          if (next[k] === chipId) next[k] = null
        }
        next[activeBlank] = chipId
        return next
      })
      // Auto-advance to the next empty blank for fast filling.
      const nextEmpty = placements.findIndex((p, idx) => p === null && idx !== activeBlank)
      setActiveBlank(nextEmpty !== -1 ? nextEmpty : null)
    },
    [checked, activeBlank, placements],
  )

  const handleCheck = () => {
    if (!allFilled || checked) return
    setChecked(true)
    const correctCount = round.answers.reduce((acc, acceptable, i) => {
      const chipId = placements[i]
      if (!chipId) return acc
      const placedWord = chips.find((c) => c.id === chipId)?.word ?? ""
      const ok = acceptable.some(
        (a) => a.trim().toLowerCase() === placedWord.trim().toLowerCase(),
      )
      return ok ? acc + 1 : acc
    }, 0)

    const roundCorrect = correctCount === round.answers.length
    say(roundCorrect ? "correct" : "wrong")
    play(roundCorrect ? "correct" : "wrong")

    // Auto-finish: for single-round this is the whole task; for multi, advance.
    setTimeout(() => {
      onScored(correctCount)
    }, 1600)
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-indigo-900">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>

      {isMulti && (
        <>
          <div className="text-xs text-slate-400 text-center">
            Предложение {current + 1} из {totalRounds}
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <motion.div
              className="bg-indigo-500 h-2 rounded-full"
              animate={{ width: `${((current + 1) / totalRounds) * 100}%` }}
            />
          </div>
        </>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={roundIndex}
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -30, opacity: 0 }}
          className="flex flex-col gap-4 py-2"
        >
          {/* The cloze text with inline blanks. */}
          <div className="bg-white/70 rounded-2xl px-4 py-5 border-2 border-indigo-100">
            <p className="text-base sm:text-lg leading-relaxed text-slate-800">
              {segments.map((seg, i) => (
                <span key={i}>
                  <Segment text={seg} underlineWords={underlineWords} />
                  {i < blankCount && (
                    <BlankSlot
                      index={i}
                      chipId={placements[i]}
                      chipWord={
                        placements[i]
                          ? chips.find((c) => c.id === placements[i])?.word
                          : undefined
                      }
                      hint={round.hints?.[i]}
                      active={activeBlank === i && !checked}
                      checked={checked}
                      result={results[i]}
                      onSelect={() => selectBlank(i)}
                    />
                  )}
                </span>
              ))}
            </p>
          </div>

          {/* Result summary banner after check. */}
          <AnimatePresence>
            {checked && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-3 rounded-xl text-base font-semibold bg-indigo-50 text-indigo-700"
              >
                {results.filter((r) => r.correct).length} из {blankCount} верно
              </motion.div>
            )}
          </AnimatePresence>

          {/* Word bank + check button (hidden after check). */}
          {!checked && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap justify-center gap-2">
                <AnimatePresence>
                  {chips.map((chip) => {
                    const used = placedChipIds.has(chip.id)
                    return (
                      <motion.button
                        key={chip.id}
                        layout
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: used ? 0 : 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => selectChip(chip.id)}
                        disabled={used || activeBlank === null}
                        className="px-3 py-2 rounded-full bg-indigo-100 border-2 border-indigo-200 text-indigo-800 font-semibold text-base hover:border-indigo-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {chip.word}
                      </motion.button>
                    )
                  })}
                </AnimatePresence>
              </div>

              {activeBlank === null && (
                <p className="text-xs text-center text-slate-400">
                  Выбери пропуск в тексте, затем слово
                </p>
              )}

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleCheck}
                disabled={!allFilled}
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

/** A text segment between blanks; underlines any word in `underlineWords`. */
function Segment({
  text,
  underlineWords,
}: {
  text: string
  underlineWords?: string[]
}) {
  if (!underlineWords || underlineWords.length === 0) {
    return <>{text}</>
  }
  const set = new Set(underlineWords.map((w) => w.toLowerCase()))
  // Split into word tokens while preserving whitespace/punctuation boundaries.
  const parts = text.split(/(\s+|[.,!?;:])/)
  return (
    <>
      {parts.map((part, i) => {
        const cleaned = part.replace(/[^A-Za-zА-Яа-я]/g, "").toLowerCase()
        const underline = cleaned !== "" && set.has(cleaned)
        return underline ? (
          <u key={i} className="decoration-indigo-500 decoration-2 underline-offset-2 font-semibold">
            {part}
          </u>
        ) : (
          <span key={i}>{part}</span>
        )
      })}
    </>
  )
}

/** A single blank slot. Empty (clickable to activate) or filled (clickable to clear). */
function BlankSlot({
  index,
  chipId,
  chipWord,
  hint,
  active,
  checked,
  result,
  onSelect,
}: {
  index: number
  chipId: string | null
  chipWord?: string
  hint?: string
  active: boolean
  checked: boolean
  result?: { correct: boolean; placed?: string; answer: string }
  onSelect: () => void
}) {
  // Styling by state.
  let cls = "border-dashed border-indigo-300 text-indigo-300"
  if (chipId) {
    cls = "bg-indigo-100 text-indigo-800 border-indigo-200"
  }
  if (active) {
    cls = "bg-indigo-50 text-indigo-600 border-indigo-400 ring-2 ring-indigo-400"
  }
  if (checked && result) {
    if (result.correct) {
      cls = "bg-green-100 text-green-700 border-green-400"
    } else {
      cls = "bg-red-100 text-red-700 border-red-400"
    }
  }

  let label = hint ? `${hint}` : "?"
  if (chipWord) label = chipWord
  if (checked && result && !result.correct) {
    label = `${result.placed ?? ""} → ${result.answer}`
  }

  return (
    <motion.button
      layout
      whileTap={{ scale: 0.95 }}
      onClick={onSelect}
      disabled={checked}
      data-blank={index}
      className={`inline-flex items-center justify-center align-baseline min-w-[80px] mx-1 px-2 py-1 rounded-lg border-2 text-base font-semibold transition-colors ${cls}`}
    >
      {label}
    </motion.button>
  )
}
