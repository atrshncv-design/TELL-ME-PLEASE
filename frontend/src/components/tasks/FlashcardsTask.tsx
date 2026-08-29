"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSound } from "@/lib/useSound"
import { ResultScreen } from "@/components/ResultScreen"

interface FlashcardItem {
  front: string
  back: string
}

interface FlashcardsTaskProps {
  title: string
  description: string
  cards: FlashcardItem[]
  onComplete?: (score: number, total: number) => void
}

/** Карточка внутри колоды: контент + флаг «уже отправлялась на повтор». */
interface DeckEntry {
  card: FlashcardItem
  retried: boolean
}

/** Перемешивание Фишера–Йетса (копия, исходный массив не меняется). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Формат таймера: M:SS. */
function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = String(s % 60).padStart(2, "0")
  return `${m}:${sec}`
}

/**
 * «Флеш-карточки» (P2): карточка со стимулом (front) → клик переворачивает
 * её 3D-флипом и показывает реакцию (back). Ученик сам оценивает себя:
 * «✅ Знаю» — карточка уходит из колоды (счётчик знаемых с первой попытки),
 * «🔄 Ещё раз» — карточка возвращается в конец колоды. В конце — общий
 * экран результата (знаю/всего), как у остальных заданий платформы.
 */
export function FlashcardsTask({ title, description, cards, onComplete }: FlashcardsTaskProps) {
  const [deck, setDeck] = useState<DeckEntry[]>(() =>
    cards.map((card) => ({ card, retried: false }))
  )
  const [flipped, setFlipped] = useState(false)
  // «Знаю» с первой попытки — честная оценка для итога (звёзды/💎).
  const [known, setKnown] = useState(0)
  // Всего нажатий «Ещё раз» за проход.
  const [repeats, setRepeats] = useState(0)
  // Прошло секунд с начала задания (таймер, опционально по тикету).
  const [seconds, setSeconds] = useState(0)
  const [finished, setFinished] = useState(false)
  // Счётчик переходов — уникальный key для AnimatePresence (карточка может
  // вернуться в колоду после «Ещё раз», поэтому key по индексу не подойдёт).
  const [transition, setTransition] = useState(0)
  // R12: индекс текущей карточки внутри deck для стрелок ←/→ без засчитывания
  const [browseIndex, setBrowseIndex] = useState(0)
  const { play } = useSound()

  const total = cards.length
  // Карточки, уже вынутые из колоды (прогресс и счётчик «X из N»).
  const done = total - deck.length

  // Кламп browseIndex при изменении длины колоды
  useEffect(() => {
    if (browseIndex >= deck.length && deck.length > 0) {
      setBrowseIndex(deck.length - 1)
    }
    if (deck.length === 0) setBrowseIndex(0)
  }, [deck.length, browseIndex])

  // Таймер тикает, пока задание не завершено.
  useEffect(() => {
    if (finished) return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [finished])

  if (!cards || cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <p className="text-slate-500">Нет данных для отображения</p>
      </div>
    )
  }

  const current = deck[browseIndex] ?? deck[0]

  // R12: стрелки — листание без засчитывания
  const canGoBack = browseIndex > 0
  const canGoForward = browseIndex < deck.length - 1
  const goPrev = () => {
    if (!canGoBack) return
    setBrowseIndex((i) => i - 1)
    setFlipped(false)
    setTransition((t) => t + 1)
  }
  const goNext = () => {
    if (!canGoForward) return
    setBrowseIndex((i) => i + 1)
    setFlipped(false)
    setTransition((t) => t + 1)
  }

  // «✅ Знаю»: убираем карточку на browseIndex; если была с первой попытки — плюс к итогу.
  const handleKnown = () => {
    if (!current || finished) return
    const firstTry = !current.retried
    const finalKnown = firstTry ? known + 1 : known
    const nextDeck = deck.filter((_, idx) => idx !== browseIndex)
    setDeck(nextDeck)
    setKnown(finalKnown)
    setFlipped(false)
    setTransition((t) => t + 1)
    // browseIndex остаётся на той же позиции — теперь там следующая карточка; если удалили последнюю — откат
    if (browseIndex >= nextDeck.length && nextDeck.length > 0) {
      setBrowseIndex(nextDeck.length - 1)
    }
    play("correct")
    if (nextDeck.length === 0) {
      setFinished(true)
      onComplete?.(finalKnown, total)
      play("fanfare")
    }
  }

  // «🔄 Ещё раз»: помечаем карточку «повторной» и возвращаем в конец колоды.
  const handleRepeat = () => {
    if (!current || finished) return
    const nextDeck = [...deck]
    const [moved] = nextDeck.splice(browseIndex, 1)
    nextDeck.push({ ...moved, retried: true })
    setDeck(nextDeck)
    setRepeats((r) => r + 1)
    setFlipped(false)
    setTransition((t) => t + 1)
    if (browseIndex >= nextDeck.length) setBrowseIndex(nextDeck.length - 1)
    play("wrong")
  }

  // «🔀 Перемешать»: тасуем всю оставшуюся колоду.
  const handleShuffle = () => {
    setDeck((d) => shuffle(d))
    setBrowseIndex(0)
    setFlipped(false)
  }

  // Полный сброс для «Ещё раз» на экране результата.
  const retry = () => {
    setDeck(cards.map((card) => ({ card, retried: false })))
    setBrowseIndex(0)
    setFlipped(false)
    setKnown(0)
    setRepeats(0)
    setSeconds(0)
    setFinished(false)
    setTransition(0)
  }

  if (finished) {
    return <ResultScreen title={title} score={known} total={total} onRetry={retry} />
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-primary-900">
        {title}
      </h2>
      <p className="text-sm text-slate-500">{description}</p>

      {/* Верхняя панель: счётчик, таймер, перемешать */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-slate-400">
          Карточка {Math.min(done + 1, total)} из {total}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
            ⏱ {formatTime(seconds)}
          </span>
          <button
            onClick={handleShuffle}
            className="min-h-[44px] rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-soft transition-colors hover:border-primary-300 hover:text-primary-700"
          >
            🔀 Перемешать
          </button>
        </div>
      </div>

      {/* Прогресс-бар: заполняется по мере «знаю» (как в QuizTask) */}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-grammar-400"
          animate={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
          transition={{ type: "spring", stiffness: 150, damping: 22 }}
        />
      </div>

      {/* R12: стрелки ←/→ для листания без засчитывания */}
      <div className="flex items-center justify-between gap-2">
        {canGoBack ? (
          <button
            onClick={goPrev}
            className="min-h-[44px] text-sm font-semibold text-slate-500 hover:text-slate-700"
          >
            ← Назад
          </button>
        ) : (
          <span className="text-sm text-transparent select-none">← Назад</span>
        )}
        <div className="text-xs font-semibold text-slate-400">
          Карточка {deck.length > 0 ? browseIndex + 1 : 0} из {deck.length}
        </div>
        {canGoForward ? (
          <button
            onClick={goNext}
            className="min-h-[44px] text-sm font-semibold text-slate-500 hover:text-slate-700"
          >
            Вперёд →
          </button>
        ) : (
          <span className="text-sm text-transparent select-none">Вперёд →</span>
        )}
      </div>

      {/* Карточка: front → клик → 3D-переворот → back */}
      <AnimatePresence mode="wait">
        <motion.div
          key={transition}
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -40, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="py-2"
        >
          <div
            className="mx-auto w-full max-w-sm"
            style={{ perspective: "1200px" }}
            onClick={() => setFlipped((f) => !f)}
          >
            <motion.div
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              style={{ transformStyle: "preserve-3d" }}
              className="relative h-64 w-full cursor-pointer select-none sm:h-72"
            >
              {/* Лицевая сторона: стимул */}
              <div
                style={{ backfaceVisibility: "hidden" }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-5 rounded-3xl border-2 border-primary-200 bg-white px-6 shadow-soft"
              >
                <span className="text-center text-4xl font-black text-slate-800 sm:text-5xl">
                  {current.card.front}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  Нажми, чтобы перевернуть 👆
                </span>
              </div>
              {/* Обратная сторона: реакция */}
              <div
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                className="absolute inset-0 flex items-center justify-center rounded-3xl bg-gradient-to-br from-primary-500 to-grammar-400 px-6 shadow-glow-primary"
              >
                <span className="text-center text-3xl font-black text-white sm:text-4xl">
                  {current.card.back}
                </span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Кнопки самооценки */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleKnown}
          className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-success px-4 py-3 text-lg font-bold text-white shadow-soft transition-colors hover:bg-success/90"
        >
          ✅ Знаю
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleRepeat}
          className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-3 text-lg font-bold text-white shadow-soft transition-colors hover:bg-amber-500"
        >
          🔄 Ещё раз
        </motion.button>
      </div>

      {/* Мини-статистика прохода */}
      <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
        <span className="rounded-full bg-success/10 px-2.5 py-1 text-success">
          ✅ Знаю: {known}
        </span>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">
          🔄 Повторов: {repeats}
        </span>
      </div>
    </div>
  )
}
