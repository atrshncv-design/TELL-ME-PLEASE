"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ResultScreen } from "@/components/ResultScreen"

interface PromptCardBlock {
  title: string
  lines: string[]
}

interface PromptCardTaskProps {
  title: string
  description: string
  /** Текст промпта дословно из документа (для вставки во внешний чат). */
  prompt: string
  /** Дополнительные блоки под промптом («Примерные вопросы…», «Страны и праздники»). */
  extra?: PromptCardBlock[]
  onComplete?: (score: number, total: number) => void
}

/**
 * Prompt Card (тикет T06, станции-промпта A1/A2/B1/B2 эпохи Present Simple) —
 * «Промпт для внешнего чата». НЕ встроенный чат: карточка с текстом промпта
 * дословно + кнопка «Скопировать» (ученик вставляет его в свой любимый чат
 * с ИИ) + кнопка «Я поговорил — отметить выполненным» (станция засчитывается
 * по факту, без ИИ-проверки).
 *
 * Валюта ⚡ Energy: тип НЕ в SPEAKING_TASK_TYPES (taskType="prompt-card" →
 * ResultScreen показывает «+1 ⚡»). onComplete(1, 1) — один раз, на финише.
 */
export function PromptCardTask({ title, description, prompt, extra, onComplete }: PromptCardTaskProps) {
  const [copied, setCopied] = useState(false)
  const [finished, setFinished] = useState(false)

  // Паттерн copyPrompt из EpochTheory.tsx (кнопка «Скопировать промпт» у
  // Suno-музыки): clipboard + состояние «✓ Скопировано!» на 2 секунды.
  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard может быть недоступен — молча игнорируем */
    }
  }

  const finish = () => {
    if (finished) return
    setFinished(true)
    onComplete?.(1, 1)
  }

  const retry = () => {
    setFinished(false)
  }

  if (finished) {
    return <ResultScreen title={title} score={1} total={1} onRetry={retry} taskType="prompt-card" />
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-primary-900">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>

      {/* Карточка промпта: текст дословно (whitespace-pre-line сохраняет
          переносы и пробелы) + кнопка копирования. */}
      <div className="rounded-2xl border-2 border-violet-100 bg-white p-4 shadow-soft">
        <p className="whitespace-pre-line text-base font-medium leading-relaxed text-slate-800">{prompt}</p>
        <button
          type="button"
          onClick={copyPrompt}
          className={`mt-3 min-h-[44px] rounded-2xl border-2 px-4 py-2 text-sm font-bold transition-colors ${
            copied
              ? "border-success bg-success/10 text-success"
              : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
          }`}
        >
          {copied ? "✓ Скопировано!" : "📋 Скопировать промпт"}
        </button>
      </div>

      {/* Дополнительные блоки под промптом (заголовки из документа). */}
      {extra && extra.length > 0 && (
        <div className="flex flex-col gap-3">
          {extra.map((block) => (
            <div key={block.title} className="rounded-2xl bg-white p-4 shadow-soft">
              <h3 className="font-display text-lg font-bold text-primary-900">{block.title}</h3>
              <ul className="mt-2 flex flex-col gap-1.5">
                {block.lines.map((line, i) => (
                  <li key={i} className="text-sm leading-relaxed text-slate-700">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={finish}
        className="min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
      >
        Я поговорил — отметить выполненным
      </motion.button>
    </div>
  )
}
