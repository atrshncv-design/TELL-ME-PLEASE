"use client"

import { useCallback, useEffect, useState } from "react"

export interface TaskProgress {
  score: number
  total: number
  ts: string
}
export type ProgressMap = Record<string, TaskProgress>

const key = (grade: string) => `tmp_progress_grade_${grade}`

/**
 * Per-grade client-side progress stored in localStorage (no backend, per
 * decision Q8). Maps taskId → { score, total, ts }. SSR-safe: returns an
 * empty map until mounted, then hydrates from localStorage.
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
    (taskId: string, score: number, total: number) => {
      setProgress((prev) => {
        // Keep the BEST result per task (decision Q13): stars and 💎 badges
        // are earned from the best run, so a weaker retake never loses them.
        const existing = prev[taskId]
        const entry =
          existing && existing.score > score
            ? existing
            : { score, total, ts: new Date().toISOString() }
        const next: ProgressMap = { ...prev, [taskId]: entry }
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
  // Gamification (decision Q13): ⭐ = sum of best scores; 💎 per 100% task.
  const totalStars = Object.values(progress).reduce((sum, p) => sum + p.score, 0)
  const perfectCount = Object.values(progress).filter(
    (p) => p.total > 0 && p.score === p.total
  ).length

  return { progress, saveTask, completedCount, totalStars, perfectCount }
}
