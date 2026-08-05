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
  // Grammar Minecraft (тикет W3-T1): режим блоков-категорий (blocksMode=true).
  blocksMode?: boolean
  blocks?: MinecraftTense[]
  onComplete?: (score: number, total: number) => void
}

/** Категория блока Grammar Minecraft: подпись по-русски на карточке. */
type BlockCategory = "subject" | "auxiliary" | "verb" | "object" | "time" | "place"

const BLOCK_CATEGORY_LABELS: Record<BlockCategory, string> = {
  subject: "ПОДЛЕЖАЩЕЕ",
  auxiliary: "ПОМОЩНИК",
  verb: "ГЛАГОЛ",
  object: "ДОПОЛНЕНИЕ",
  time: "ВРЕМЯ",
  place: "МЕСТО",
}

interface MinecraftBlock {
  category: BlockCategory
  word: string
}

interface MinecraftTense {
  tense: string
  label: string
  blocks: MinecraftBlock[]
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
  blocksMode,
  blocks,
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

  // Grammar Minecraft (тикет W3-T1): режим блоков-категорий. Полностью
  // отдельный путь — старый комбинатор (adverbs × time_phrases) ниже остаётся
  // нетронутым для заданий без blocksMode. Все хуки уже вызваны — ранний
  // return безопасен (правила хуков).
  if (blocksMode && blocks && blocks.length > 0) {
    return (
      <MinecraftBlocksMode
        title={title}
        description={description}
        blocks={blocks}
        onComplete={onComplete}
      />
    )
  }

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

/** Результат «перестройки» при смене времени: какие категории изменились. */
interface TenseDiff {
  /** Категории изменённых/добавленных/исчезнувших блоков — для подсветки. */
  keys: BlockCategory[]
  /** Подпись «Что изменилось: …» (глагол, время, помощник…). */
  caption: string
  fromLabel: string
}

/**
 * Grammar Minecraft (тикет W3-T1): режим блоков-категорий.
 *
 * 1. Сборка: ученик собирает предложение стартового времени из блоков-карточек
 *    (категории ПОДЛЕЖАЩЕЕ/ПОМОЩНИК/ГЛАГОЛ/ДОПОЛНЕНИЕ/ВРЕМЯ/МЕСТО), слова —
 *    из общего банка (включая слова других времён-дистракторы). «Проверить» →
 *    вердикт (+1 за верную сборку).
 * 2. «Сменить время»: кнопки всех вариантов из JSON. Блоки ПЕРЕСТРАИВАЮТСЯ САМИ
 *    (рекомендация тикета), изменённые подсвечиваются (цвет + пульс) и под ними
 *    подпись «Что изменилось: …». Каждое новое посещённое время = +1.
 * 3. «Завершить» → ResultScreen (N из M, M = число вариантов времени).
 */
function MinecraftBlocksMode({
  title,
  description,
  blocks,
  onComplete,
}: {
  title: string
  description: string
  blocks: MinecraftTense[]
  onComplete?: (score: number, total: number) => void
}) {
  const [current, setCurrent] = useState(0)
  // placed[category] = слово, поставленное учеником в слот категории.
  const [placed, setPlaced] = useState<Partial<Record<BlockCategory, string>>>({})
  const [checked, setChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [score, setScore] = useState(0)
  // Посещённые варианты времени (0 = стартовое; очко — только за НОВОЕ время).
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]))
  const [diff, setDiff] = useState<TenseDiff | null>(null)
  const [finished, setFinished] = useState(false)
  const { play } = useSound()

  if (blocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <p className="text-slate-500">Нет данных для отображения</p>
      </div>
    )
  }

  const tense = blocks[current]
  const slots = tense.blocks

  // Банк слов: все слова всех вариантов времени (уникальные), категория —
  // из первого блока, где слово встретилось. Слова других времён = дистракторы.
  const bankItems: { word: string; category: BlockCategory }[] = []
  const seenWords = new Set<string>()
  for (const t of blocks) {
    for (const b of t.blocks) {
      if (!seenWords.has(b.word)) {
        seenWords.add(b.word)
        bankItems.push({ word: b.word, category: b.category })
      }
    }
  }

  const allFilled = slots.every((b) => placed[b.category] !== undefined)
  const targetSentence = slots.map((b) => b.word).join(" ")

  const placeWord = (category: BlockCategory, word: string) => {
    if (checked) return
    // Слова категорий, которых нет в текущем времени, в слот не кладутся
    // (кнопка такого слова заблокирована, но защита не помешает).
    if (!slots.some((b) => b.category === category)) return
    setPlaced((prev) => ({ ...prev, [category]: word }))
  }

  const removeWord = (category: BlockCategory) => {
    if (checked) return
    setPlaced((prev) => {
      const next = { ...prev }
      delete next[category]
      return next
    })
  }

  const handleCheck = () => {
    if (checked || !allFilled) return
    const correct = slots.every((b) => placed[b.category] === b.word)
    setIsCorrect(correct)
    if (correct) setScore((s) => s + 1)
    setChecked(true)
    play(correct ? "correct" : "wrong")
  }

  // «Сменить время»: блоки перестраиваются сами, изменённые подсвечиваются.
  const switchTense = (idx: number) => {
    if (idx === current || checked === false || finished) return
    const from = blocks[current]
    const to = blocks[idx]
    const fromMap = new Map(from.blocks.map((b) => [b.category, b.word]))
    const toMap = new Map(to.blocks.map((b) => [b.category, b.word]))
    const keys: BlockCategory[] = []
    const bits: string[] = []
    for (const [cat, word] of toMap) {
      const label = BLOCK_CATEGORY_LABELS[cat]
      if (!fromMap.has(cat)) {
        keys.push(cat)
        bits.push(`добавилось ${label.toLowerCase()}: ${word}`)
      } else if (fromMap.get(cat) !== word) {
        keys.push(cat)
        bits.push(`${label.toLowerCase()}: ${fromMap.get(cat)} → ${word}`)
      }
    }
    for (const [cat] of fromMap) {
      if (!toMap.has(cat)) {
        keys.push(cat)
        bits.push(`исчезло ${BLOCK_CATEGORY_LABELS[cat].toLowerCase()}`)
      }
    }
    setDiff({
      keys,
      caption: bits.length > 0 ? bits.join("; ") : "ничего",
      fromLabel: from.label,
    })
    setCurrent(idx)
    if (!visited.has(idx)) {
      setVisited((prev) => new Set(prev).add(idx))
      setScore((s) => s + 1)
    }
  }

  const finish = () => {
    setFinished(true)
    play("fanfare")
    onComplete?.(score, blocks.length)
  }

  const retry = () => {
    setCurrent(0)
    setPlaced({})
    setChecked(false)
    setIsCorrect(false)
    setScore(0)
    setVisited(new Set([0]))
    setDiff(null)
    setFinished(false)
  }

  if (finished) {
    return (
      <ResultScreen title={title} score={score} total={blocks.length} onRetry={retry} />
    )
  }

  const blockClass = (slot: MinecraftBlock, filled: boolean): string => {
    if (checked && diff && diff.keys.includes(slot.category)) {
      return "bg-amber-50 border-2 border-amber-400 text-amber-900"
    }
    if (checked) {
      const correct = placed[slot.category] === slot.word
      return correct
        ? "bg-success/10 border-2 border-success text-green-700"
        : "bg-danger/10 border-2 border-danger text-red-700"
    }
    return filled
      ? "bg-white border-2 border-primary-300 text-slate-800"
      : "bg-white/60 border-2 border-dashed border-primary-200 text-slate-400"
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-primary-900">
        {title}
      </h2>
      <p className="text-sm text-slate-500">{description}</p>

      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-slate-400">
          Время {current + 1} из {blocks.length}
        </div>
        <div className="text-xs font-semibold text-slate-500">{tense.label}</div>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-grammar-400"
          animate={{ width: `${((current + 1) / blocks.length) * 100}%` }}
          transition={{ type: "spring", stiffness: 150, damping: 22 }}
        />
      </div>

      {/* Ряд блоков-карточек: при сборке — слоты, после проверки — готовое
          предложение текущего времени (перестроенное). */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -30, opacity: 0 }}
          className="flex flex-wrap items-stretch justify-center gap-2 bg-white/70 rounded-2xl px-4 py-5 border-2 border-primary-100"
        >
          {slots.map((slot) => {
            const filled = placed[slot.category] !== undefined
            const highlighted = checked && diff !== null && diff.keys.includes(slot.category)
            return (
              <motion.button
                key={slot.category}
                layout
                whileTap={{ scale: 0.95 }}
                onClick={() => filled && removeWord(slot.category)}
                disabled={checked || !filled}
                animate={highlighted ? { scale: [1, 1.06, 1] } : {}}
                transition={highlighted ? { duration: 0.7, repeat: Infinity } : {}}
                className={`min-w-[104px] rounded-xl px-3 py-2 text-center transition-colors ${blockClass(slot, filled)}`}
              >
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {BLOCK_CATEGORY_LABELS[slot.category]}
                </span>
                <span className="block text-lg font-bold leading-tight">
                  {checked ? slot.word : filled ? placed[slot.category] : "?"}
                </span>
              </motion.button>
            )
          })}
        </motion.div>
      </AnimatePresence>

      {/* Вердикт сборки (до первой смены времени). */}
      <AnimatePresence>
        {checked && diff === null && (
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
            {isCorrect ? "✓ Правильно!" : `✗ Неверно. Ответ: ${targetSentence}`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Подпись «Что изменилось» после смены времени. */}
      <AnimatePresence>
        {checked && diff !== null && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center py-3 rounded-xl bg-amber-50 text-amber-800 text-base font-semibold"
          >
            Что изменилось: {diff.caption}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Банк слов — только во время сборки. */}
      {!checked && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap justify-center gap-2">
            {bankItems.map((item) => {
              const hasSlot = slots.some((b) => b.category === item.category)
              const active = placed[item.category] === item.word
              return (
                <motion.button
                  key={item.word}
                  layout
                  whileTap={{ scale: 0.95 }}
                  onClick={() => placeWord(item.category, item.word)}
                  disabled={!hasSlot}
                  className={`px-3 py-2 rounded-full border-2 font-semibold text-base transition-colors ${
                    active
                      ? "bg-primary-600 border-primary-600 text-white"
                      : "bg-primary-100 border-primary-200 text-primary-800 hover:border-primary-400 disabled:opacity-35 disabled:hover:border-primary-200"
                  }`}
                >
                  {item.word}
                </motion.button>
              )
            })}
          </div>

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

      {/* «Сменить время» + «Завершить» — после вердикта сборки. */}
      {checked && (
        <div className="flex flex-col gap-3">
          <div className="text-center text-sm font-semibold text-slate-500">
            Сменить время:
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {blocks.map((t, idx) => (
              <button
                key={t.tense}
                onClick={() => switchTense(idx)}
                disabled={idx === current}
                className={`min-h-[44px] rounded-xl px-4 py-2 font-bold transition-colors ${
                  idx === current
                    ? "bg-primary-600 text-white shadow-glow-primary"
                    : "bg-white border-2 border-primary-200 text-primary-700 hover:border-primary-400"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={finish}
            className="mt-1 w-full min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
          >
            Завершить
          </motion.button>
        </div>
      )}
    </div>
  )
}
