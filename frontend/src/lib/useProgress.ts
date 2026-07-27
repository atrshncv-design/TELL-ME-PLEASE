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
        const next: ProgressMap = {
          ...prev,
          [taskId]: { score, total, ts: new Date().toISOString() },
        }
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

  return { progress, saveTask, completedCount }
}
