"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useVerbBot } from "@/components/VerbBot"
import { useSound } from "@/lib/useSound"
import { ResultScreen } from "@/components/ResultScreen"
import { StickerReaction } from "@/components/StickerReaction"
import type { SentenceBuilderItem, SentenceBuilderColumn, SentenceBuilderRole } from "@/types/task"

interface SentenceBuilderTaskProps {
  title: string
  description: string
  items: SentenceBuilderItem[]
  onComplete?: (score: number, total: number) => void
}

/** Фиксированный порядок ролей: Подлежащее → Сказуемое → Дополнение → Обстоятельство. */
const ROLE_ORDER: SentenceBuilderRole[] = ["subject", "verb", "object", "adverbial"]

/** Нормализация для сравнения (контракт тикета T05): trim/lowercase/’→'. */
function normalizeSentence(s: string): string {
  return s.trim().toLowerCase().replace(/’/g, "'")
}

/**
 * SentenceBuilder (тикет T05, станция A1.5 «Визуализация Синтаксиса») —
 * «Построй предложение».
 *
 * Внизу 4 столбика-банка: Подлежащее (кто/что?), Сказуемое (что делает?),
 * Дополнение (с каким предметом?), Обстоятельство (как/где/когда?). В каждом
 * столбике — слова определённого типа (1 тип = 1 столбик). Ребёнок тапает по
 * чипу → слово «уходит» в слот строки-результата ВЫШЕ столбиков; повторный
 * тап возвращает слово в банк («можно менять ответ»). «Проверить» активна,
 * когда в каждом непустом столбике выбран чип → вердикт (собранное
 * предложение vs answer, нормализация trim/lowercase/’→') → «Далее».
 * После последнего предложения — ResultScreen (taskType="sentence-builder" →
 * «+N ⚡»: тип НЕ в SPEAKING_TASK_TYPES, useProgress не трогаем).
 * Счёт = верно собранные предложения / items.length; onComplete(score, total)
 * — один раз на финише.
 */
export function SentenceBuilderTask({ title, description, items, onComplete }: SentenceBuilderTaskProps) {
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  // selected[role] = слово, выбранное из столбика role (null = ещё не выбрано).
  const [selected, setSelected] = useState<Record<string, string | null>>({})
  const [showResult, setShowResult] = useState(false)
  const [finished, setFinished] = useState(false)
  const { say } = useVerbBot()
  const { play } = useSound()
  // Стикер-реакция на последний ответ. Ключ = номер item'а, чтобы
  // AnimatePresence перезапускал анимацию на каждом ответе.
  const [reaction, setReaction] = useState<{ key: number; correct: boolean } | null>(null)

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

  // Столбики в фиксированном порядке ролей; пустые (words: []) пропускаются.
  const ordered = ROLE_ORDER
    .map((role) => (item.columns || []).find((c) => c.role === role))
    .filter((c): c is SentenceBuilderColumn => Boolean(c && c.words && c.words.length > 0))

  const builtWords = ordered.map((c) => selected[c.role] ?? null)
  const built = builtWords.filter((w): w is string => w !== null).join(" ")

  // «Проверить» активна, когда в каждом непустом столбике выбран чип.
  const allFilled = ordered.every((c) => selected[c.role] != null)
  const canCheck = !showResult && allFilled

  /** Тап по чипу: слово уходит в слот строки-результата; повторный тап — возврат в банк. */
  const toggleWord = (role: string, word: string) => {
    if (showResult) return
    setSelected((prev) => (prev[role] === word ? { ...prev, [role]: null } : { ...prev, [role]: word }))
  }

  /** «Проверить»: собранное предложение (слова + ".") сравнивается с answer. */
  const handleCheck = () => {
    if (!canCheck) return
    const candidate = built + "."
    const correct = normalizeSentence(candidate) === normalizeSentence(item.answer)
    if (correct) setScore((s) => s + 1)
    say(correct ? "correct" : "wrong")
    play(correct ? "correct" : "wrong")
    setReaction({ key: current, correct })
    setShowResult(true)
  }

  /** «Далее»: следующее предложение, после последнего — ResultScreen
   *  (onComplete(score, total) вызывается ровно один раз). */
  const advance = () => {
    setReaction(null)
    if (current + 1 < items.length) {
      setCurrent(current + 1)
      setSelected({})
      setShowResult(false)
    } else {
      setFinished(true)
      onComplete?.(score, items.length)
      say("finish")
      play("fanfare")
    }
  }

  const retry = () => {
    setCurrent(0)
    setScore(0)
    setSelected({})
    setShowResult(false)
    setFinished(false)
    setReaction(null)
  }

  if (finished) {
    return (
      <ResultScreen title={title} score={score} total={items.length} onRetry={retry} taskType="sentence-builder" />
    )
  }

  const correct = showResult ? normalizeSentence(built + ".") === normalizeSentence(item.answer) : false

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-primary-900">
        {title}
      </h2>
      <p className="text-sm text-slate-500">{description}</p>

      <div className="text-xs font-semibold text-slate-400">
        Предложение {current + 1} из {items.length}
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-grammar-400"
          animate={{ width: `${((current + 1) / items.length) * 100}%` }}
          transition={{ type: "spring", stiffness: 150, damping: 22 }}
        />
      </div>

      {/* Строка-результат: собранное предложение формируется ВЫШЕ столбиков.
          БЕЗ AnimatePresence mode="wait": при смене current старый узел мог
          застревать в exit-состоянии (opacity:0) и новый не монтировался —
          строка «исчезала» после 2-го предложения (реальный баг, смоук
          T05 14.08). Простой key-ремаунт: старый узел удаляется сразу,
          новый появляется с initial-анимацией. */}
      <motion.div
        key={current}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`relative rounded-2xl border-2 bg-white px-4 py-4 shadow-soft transition-colors ${
            showResult ? (correct ? "border-success" : "border-danger") : "border-primary-100"
          }`}
        >
          {builtWords.every((w) => w === null) ? (
            <p className="text-center text-sm font-semibold text-slate-400">
              👆 Выбери слова из столбиков ниже — предложение появится здесь
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {ordered.map((c, i) => {
                  const word = builtWords[i]
                  return (
                    <motion.span
                      key={c.role}
                      layout
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`rounded-xl border-2 px-2.5 py-1 text-base font-bold ${
                        word
                          ? "border-primary-300 bg-primary-50 text-primary-800"
                          : "border-dashed border-slate-200 bg-slate-50 text-slate-300"
                      }`}
                    >
                      {word ?? "___"}
                    </motion.span>
                  )
                })}
              </div>
              <p className={`mt-2 text-center text-lg font-bold ${correct ? "text-success" : "text-slate-800"}`}>
                {built}
                {correct ? " ✓" : ""}
              </p>
              {showResult && !correct && (
                <p className="mt-1 text-center text-sm font-semibold text-slate-500">
                  Правильно: <span className="text-success">{item.answer}</span>
                </p>
              )}
            </>
          )}
        </motion.div>

      {/* 4 столбика-банка: Подлежащее / Сказуемое / Дополнение / Обстоятельство. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ordered.map((col) => {
          return (
            <div
              key={col.role}
              className={`flex flex-col gap-1.5 rounded-2xl border-2 p-2 bg-primary-50/50 ${
                showResult ? (correct ? "border-success" : "border-danger") : "border-primary-100"
              }`}
            >
              <div className="px-1 text-center">
                <p className="text-xs font-extrabold uppercase tracking-wide text-primary-700">{col.label}</p>
                {col.hint && <p className="text-[10px] font-semibold text-slate-400">{col.hint}</p>}
              </div>
              {col.words.map((word) => {
                const isChosen = selected[col.role] === word
                return (
                  <motion.button
                    key={word}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleWord(col.role, word)}
                    disabled={showResult}
                    className={`min-h-[44px] rounded-xl border-2 px-2 py-2 text-sm font-bold transition-colors ${
                      isChosen
                        ? "border-primary-600 bg-primary-600 text-white shadow-glow-primary"
                        : "border-primary-200 bg-white text-slate-700 hover:border-primary-400"
                    }`}
                  >
                    {word}
                  </motion.button>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Стикер-реакция на последний ответ — по центру поверх столбиков. */}
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

      {/* CTA: «Проверить» (когда все непустые столбики заполнены) → «Далее». */}
      <div className="mt-1">
        {!showResult ? (
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
