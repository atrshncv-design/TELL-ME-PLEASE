"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useVerbBot } from "@/components/VerbBot"
import { useSound } from "@/lib/useSound"
import { ResultScreen } from "@/components/ResultScreen"
import { StickerReaction } from "@/components/StickerReaction"
import type { TextFixData, TextFixError } from "@/types/task"

interface TextFixTaskProps {
  title: string
  description: string
  /** textFix-поле станции: предложения с ошибками + инструкция. */
  data: TextFixData
  onComplete?: (score: number, total: number) => void
}

/** Разбивает предложение на слова (пунктуация остаётся приклеенной к словам). */
function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(Boolean)
}

/** Сравнение токена с `wrong` — регистронезависимо, пунктуация с краёв
 *  игнорируется (тот же контракт, что в click-mistake и verify-epoch.mjs). */
function normalizeWord(word: string): string {
  return word.replace(/^[^\p{L}\p{N}'-]+|[^\p{L}\p{N}'-]+$/gu, "").toLowerCase()
}

/** Ключ ошибки: `${si}:${ei}` (предложение:ошибка). */
function errKey(si: number, ei: number): string {
  return `${si}:${ei}`
}

/** Фолбэк-варианты, если в JSON нет options: морфологические соседи right.
 *  Пилот всегда приносит options; это защитный путь для контента без них. */
function defaultOptions(err: TextFixError): string[] {
  const right = err.right
  const candidates = [
    right,
    right.endsWith("s") || right.endsWith("es") ? right.replace(/es?$/, "") : `${right}s`,
    `${right}ed`,
    `${right}ing`,
  ]
  const out: string[] = []
  for (const c of candidates) {
    if (!c || c.length < 2) continue
    if (normalizeWord(c) === normalizeWord(err.wrong)) continue
    if (out.some((o) => normalizeWord(o) === normalizeWord(c))) continue
    out.push(c)
  }
  return out
}

/**
 * TextFix (тикет T06, станция B2.4 «Стабилизация Реальности») — «Исправь N
 * ошибок в тексте».
 *
 * Текст показан как абзацы; слова-ошибки (по index из JSON) — кликабельные.
 * Клик по ошибочному слову подсвечивает его и открывает список вариантов
 * исправления (верный right + 2–3 дистрактора из options; выбор можно менять
 * до «Проверить»). «Проверить» → вердикт: исправленные слова ✓/✗ (success/
 * danger), звук + say бота; «Далее» → ResultScreen (taskType="text-fix" →
 * «+N ⚡»: тип НЕ в SPEAKING_TASK_TYPES, useProgress не трогаем).
 * Счёт = верно исправленные ошибки / всего ошибок; onComplete(score, total) —
 * один раз на финише.
 */
export function TextFixTask({ title, description, data, onComplete }: TextFixTaskProps) {
  const sentences = data?.sentences || []
  // Плоский список ошибок с ключами — для подсчёта, вердикта и picker-а.
  const errors = sentences.flatMap((s, si) =>
    (s.errors || []).map((e, ei) => ({ key: errKey(si, ei), si, ei, error: e })),
  )
  const total = errors.length

  const [fixes, setFixes] = useState<Record<string, string>>({})
  const [active, setActive] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  const [finished, setFinished] = useState(false)
  const [reaction, setReaction] = useState<{ key: number; correct: boolean; score: number } | null>(null)
  const { say } = useVerbBot()
  const { play } = useSound()

  if (!sentences.length || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <p className="text-slate-500">Нет данных для отображения</p>
      </div>
    )
  }

  const fixedCount = Object.keys(fixes).length
  const correctCount = errors.filter(({ key, error }) => fixes[key] === error.right).length
  const activeEntry = active ? errors.find((e) => e.key === active) : null
  const activeError = activeEntry?.error || null
  const activeOptions = activeError
    ? activeError.options && activeError.options.length > 0
      ? activeError.options
      : defaultOptions(activeError)
    : []

  /** Клик по ошибочному слову — подсветка + открытие picker-а (повторный клик закрывает). */
  const handleWordClick = (key: string) => {
    if (checked || finished) return
    setActive((cur) => (cur === key ? null : key))
  }

  /** Выбор варианта исправления (можно менять до «Проверить»). */
  const chooseOption = (key: string, option: string) => {
    if (checked || finished) return
    setFixes((prev) => ({ ...prev, [key]: option }))
  }

  /** «Проверить»: вердикт по ВСЕМ ошибкам сразу — ✓/✗, звук + say бота. */
  const handleCheck = () => {
    if (checked || finished || fixedCount === 0) return
    const correct = errors.filter(({ key, error }) => fixes[key] === error.right).length
    const all = correct === total
    setChecked(true)
    setActive(null)
    setReaction({ key: 1, correct: all, score: correct })
    play(all ? "correct" : "wrong")
    say(all ? "correct" : "wrong")
  }

  /** «Далее» после вердикта → ResultScreen; onComplete ровно один раз. */
  const handleFinish = () => {
    if (!checked || finished) return
    setFinished(true)
    onComplete?.(correctCount, total)
    play("fanfare")
    say("finish")
  }

  const retry = () => {
    setFixes({})
    setActive(null)
    setChecked(false)
    setFinished(false)
    setReaction(null)
  }

  if (finished) {
    return <ResultScreen title={title} score={correctCount} total={total} onRetry={retry} taskType="text-fix" />
  }

  /** Слово-ошибка в тексте: кликабельное до проверки, вердикт ✓/✗ после. */
  const renderErrorToken = (si: number, ei: number, err: TextFixError, token: string) => {
    const key = errKey(si, ei)
    const chosen = fixes[key]
    if (checked) {
      const isCorrect = chosen === err.right
      const isMissed = chosen === undefined
      if (isCorrect) {
        return (
          <motion.span
            key={key}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-1 rounded-lg border border-success bg-success/10 px-1.5 font-bold text-success"
          >
            <s className="font-normal opacity-50">{err.wrong}</s>
            <span>→</span>
            <span>{err.right}</span>
            <span>✓</span>
          </motion.span>
        )
      }
      return (
        <motion.span
          key={key}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`inline-flex items-center gap-1 rounded-lg border px-1.5 font-bold ${
            isMissed ? "border-slate-300 bg-slate-100 text-slate-500" : "border-danger bg-danger/10 text-danger"
          }`}
        >
          <s className="font-normal opacity-50">{err.wrong}</s>
          <span>→</span>
          <span>{chosen || err.right}</span>
          <span>✗</span>
        </motion.span>
      )
    }
    const isActive = active === key
    const isFixed = chosen !== undefined
    return (
      <button
        key={key}
        onClick={() => handleWordClick(key)}
        className={`inline-flex min-h-[44px] items-center rounded-lg border-2 px-1.5 font-bold transition-colors ${
          isActive
            ? "border-primary-600 bg-primary-600 text-white"
            : isFixed
              ? "border-primary-600 bg-primary-100 text-primary-700"
              : "border-dashed border-primary-300 bg-white text-primary-600 underline decoration-dotted hover:border-primary-500 hover:bg-primary-50"
        }`}
        aria-pressed={isActive || isFixed}
      >
        {/* W3-T03 (client-fixes-0808): выбранный вариант «встаёт в поле» —
            ошибочное слово зачёркивается, рядом показывается выбранное
            исправление (до этого в тексте оставался исходный токен, и было
            непонятно, применился ли выбор). */}
        {isFixed ? (
          <span className="inline-flex items-center gap-1">
            <s className="font-normal opacity-60">{err.wrong}</s>
            <span>→</span>
            <span>{chosen}</span>
          </span>
        ) : (
          token
        )}
      </button>
    )
  }

  /** Предложение: токены, ошибки — кликабельные кнопки, остальное — текст. */
  const renderSentence = (si: number, sentence: string, errs: TextFixError[]) => {
    const tokens = tokenize(sentence)
    const errByIndex = new Map<number, { ei: number; error: TextFixError }>()
    errs.forEach((error, ei) => {
      const idx = error.index
      if (Number.isInteger(idx) && idx >= 0 && idx < tokens.length) {
        errByIndex.set(idx, { ei, error })
      }
    })
    return (
      <p key={si} className="mb-3 flex flex-wrap gap-x-1.5 gap-y-1 text-lg leading-relaxed text-slate-800 last:mb-0">
        {tokens.map((tok, ti) => {
          const hit = errByIndex.get(ti)
          return hit ? renderErrorToken(si, hit.ei, hit.error, tok) : <span key={ti}>{tok}</span>
        })}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-primary-900">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>

      {data.instruction && (
        <p className="rounded-2xl bg-primary-100 px-4 py-2.5 text-sm font-semibold text-primary-800">
          🎯 {data.instruction}
        </p>
      )}

      <div className="text-xs font-semibold text-slate-400">
        Исправлено: {fixedCount} из {total}
      </div>

      <div className="rounded-2xl border-2 border-primary-100 bg-white p-4 shadow-soft">
        {sentences.map((s, si) => renderSentence(si, s.sentence, s.errors || []))}
      </div>

      {/* Плавающий picker-вариантов для активного слова-ошибки. */}
      <AnimatePresence mode="wait">
        {activeEntry && activeError && (
          <motion.div
            key={activeEntry.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="rounded-2xl border-2 border-primary-200 bg-white p-3 shadow-soft"
          >
            <p className="text-sm font-semibold text-slate-600">
              Слово «{activeError.wrong}» — выбери исправление:
            </p>
            {sentences[activeEntry.si].hint && (
              <p className="mt-1 text-xs text-slate-400">💡 {sentences[activeEntry.si].hint}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {activeOptions.map((opt) => {
                const isChosen = fixes[activeEntry.key] === opt
                return (
                  <button
                    key={opt}
                    onClick={() => chooseOption(activeEntry.key, opt)}
                    className={`min-h-[44px] rounded-xl border-2 px-4 py-2 font-bold transition-colors ${
                      isChosen
                        ? "border-primary-600 bg-primary-600 text-white"
                        : "border-primary-200 bg-white text-slate-700 hover:border-primary-400"
                    }`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reaction && (
          <motion.div
            key="verdict"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`relative mt-1 rounded-2xl px-4 py-3 text-center text-base font-bold ${
              reaction.correct ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
            }`}
          >
            {reaction.correct
              ? "✨ Все ошибки исправлены!"
              : `💪 Исправлено верно: ${reaction.score} из ${total}`}
            <AnimatePresence>
              {reaction && (
                <StickerReaction
                  key={reaction.key}
                  id={reaction.correct ? "fire" : "oops"}
                  text={reaction.correct ? `+${reaction.score} ⚡` : undefined}
                  className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-1">
        {!checked ? (
          fixedCount > 0 && (
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
            onClick={handleFinish}
            className="w-full min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
          >
            Далее
          </motion.button>
        )}
      </div>
    </div>
  )
}
