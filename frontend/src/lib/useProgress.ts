"use client"

import { useCallback, useEffect, useState } from "react"

/** Голосовые (речевые) типы заданий — зарабатывают 🗣 Communication.
 *  Всё остальное — ⚡ Energy (тикет W1-T1). Единый источник правды:
 *  saveTask классифицирует по нему, ResultScreen показывает «+N 🗣/⚡». */
export const SPEAKING_TASK_TYPES: readonly string[] = [
  "voice-chat",
  "role-play",
  "fill-in-and-speak",
  // Тикет W1-T4: Choose Your Story — ученик строит рассказ вслух/на экране,
  // задание речевое (самооценка + авто-проверка времён) → награда 🗣.
  "choose-story",
]

export interface TaskProgress {
  score: number
  total: number
  ts: string
  /** true для голосовых заданий (voice-chat/role-play/fill-in-and-speak).
   *  Отсутствует в старом формате localStorage → трактуется как ⚡ energy
   *  (миграция W1-T1: старое ⭐ перечитывается как ⚡). */
  speaking?: boolean
}
export type ProgressMap = Record<string, TaskProgress>

const key = (grade: string) => `tmp_progress_grade_${grade}`

/** Правило «лучший результат» + признак валюты (W1-T1): возвращает новую
 *  карту с записью для taskId. Вынесено из saveTask чистой функцией, чтобы
 *  ad-hoc скрипт мог проверить подсчёт ⚡/🗣 без рендера React. */
export function nextProgressEntry(
  prev: ProgressMap,
  taskId: string,
  score: number,
  total: number,
  taskType?: string
): ProgressMap {
  const existing = prev[taskId]
  const entry: TaskProgress =
    existing && existing.score > score
      ? existing
      : {
          score,
          total,
          ts: new Date().toISOString(),
          speaking: taskType ? SPEAKING_TASK_TYPES.includes(taskType) : false,
        }
  return { ...prev, [taskId]: entry }
}

/** Чистая агрегация прогресса (W1-T1): ⚡ energyTotal = сумма баллов за
 *  не-голосовые, 🗣 commTotal = сумма баллов за голосовые. Записи без
 *  признака speaking (старый формат) идут в energy. */
export function computeTotals(progress: ProgressMap) {
  let energyTotal = 0
  let commTotal = 0
  for (const p of Object.values(progress)) {
    if (p.speaking) commTotal += p.score
    else energyTotal += p.score
  }
  return { energyTotal, commTotal }
}

/**
 * Per-grade client-side progress stored in localStorage (no backend, per
 * decision Q8). Maps taskId → { score, total, ts, speaking? }. SSR-safe:
 * returns an empty map until mounted, then hydrates from localStorage.
 * Две валюты (тикет W1-T1): ⚡ Energy (не-голосовые) + 🗣 Communication
 * (голосовые: voice-chat / role-play / fill-in-and-speak). Старый формат
 * localStorage (без speaking) перечитывается как ⚡ energy.
 */
export function useProgress(grade: string) {
  const [progress, setProgress] = useState<ProgressMap>({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key(grade))
      if (raw) setProgress(JSON.parse(raw))
    } catch {
      /* ignore malformed / unavailable storage */
    }
  }, [grade])

  const saveTask = useCallback(
    (taskId: string, score: number, total: number, taskType?: string) => {
      setProgress((prev) => {
        // Best-result rule + currency flag (W1-T1) живут в чистой функции
        // nextProgressEntry; localStorage пишется здесь, как и раньше.
        const next = nextProgressEntry(prev, taskId, score, total, taskType)
        try {
          localStorage.setItem(key(grade), JSON.stringify(next))
        } catch {
          /* ignore quota / unavailable storage */
        }
        return next
      })
    },
    [grade]
  )

  const completedCount = Object.keys(progress).length
  // Gamification (decision Q13): ⚡/🗣 = суммы лучших результатов по валютам.
  const { energyTotal, commTotal } = computeTotals(progress)
  // Совместимость (W1-T1): старое имя totalStars (⭐) теперь равно ⚡ energy.
  const totalStars = energyTotal
  const perfectCount = Object.values(progress).filter(
    (p) => p.total > 0 && p.score === p.total
  ).length

  return { progress, saveTask, completedCount, totalStars, energyTotal, commTotal, perfectCount }
}
