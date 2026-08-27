"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { EPOCH_META, type EpochCol, type EpochRow } from "@/lib/epochs-meta"
import {
  epochPercent,
  type EpochProgress,
  type EpochSector,
} from "@/lib/epoch"

/**
 * Десктоп-карта эпох (прогон epoch-map-redesign, тикет 01): фон — плакат
 * клиентки (public/map/epoch-map.svg), поверх — живые карточки в ячейках
 * матрицы. Прогресс приходит пропом (в localStorage лезет страница-
 * интегратор), сектора для галочки «эпоха пройдена» компонент дочитывает
 * из статичного /content/epochs/<slug>/index.json — тот же источник, что
 * у страницы эпохи.
 */

/** Геометрия ячеек плаката в долях viewBox (3401.57×1700.79); вычислена
 *  из rect'ов исходного SVG: ячейка 718.5×438.3, x₀=301.8, шаг колонки
 *  739.3, y₀=254.7, шаг строки 460.65. Наружу не выставляется. */
const VB_W = 3401.57
const VB_H = 1700.79
const CELL_X0 = 301.8
const CELL_Y0 = 254.7
const CELL_DX = 739.3
const CELL_DY = 460.65
const CELL_W = 718.5
const CELL_H = 438.3

const ROW_INDEX: Record<EpochRow, number> = { present: 0, past: 1, future: 2 }
const COL_INDEX: Record<EpochCol, number> = {
  simple: 0,
  continuous: 1,
  perfect: 2,
  perfectContinuous: 3,
}

const pct = (v: number, base: number) => `${(v / base) * 100}%`

export interface EpochMapPosterProps {
  /** Прогресс станций по grade-ключам (формат EpochProgress из
   *  lib/epoch.ts): объединение tmp_progress_grade_<N> всех секторов. */
  progress: EpochProgress
  /** Фон-плакат не загрузился — страница решает, что показать вместо
   *  карты (например, обычный список). Сам компонент не падает. */
  onFallback?: () => void
}

export default function EpochMapPoster({ progress, onFallback }: EpochMapPosterProps) {
  const router = useRouter()
  // Сектора эпох — только для галочки; без них карта работает, галочек нет.
  const [sectorsBySlug, setSectorsBySlug] = useState<Record<string, EpochSector[]> | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all(
      EPOCH_META.map((m) =>
        fetch(`/content/epochs/${m.slug}/index.json`).then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const json = (await res.json()) as { sectors?: EpochSector[] }
          return json.sectors ?? []
        })
      )
    )
      .then((arr) => {
        if (cancelled) return
        const map: Record<string, EpochSector[]> = {}
        EPOCH_META.forEach((m, i) => {
          map[m.slug] = arr[i]
        })
        setSectorsBySlug(map)
      })
      .catch((err) => {
        console.error("[EpochMapPoster] Failed to load epoch sectors", err)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Галочка = пройдены ВСЕ 4 сектора эпохи (все станции со score > 0) —
  // тот же порог, что у входа на экзамен (решение 5 спеки).
  const isDone = (slug: string): boolean => {
    const sectors = sectorsBySlug?.[slug]
    if (!sectors || sectors.length === 0) return false
    return epochPercent(progress, sectors) === 100
  }

  return (
    <div className="relative w-full">
      <img
        src="/map/epoch-map.svg"
        alt="Карта эпох: матрица 12 времён английского"
        draggable={false}
        className="block w-full"
        onError={() => onFallback?.()}
      />
      {EPOCH_META.map((meta) => {
        const x = CELL_X0 + COL_INDEX[meta.cell.col] * CELL_DX
        const y = CELL_Y0 + ROW_INDEX[meta.cell.row] * CELL_DY
        return (
          <div
            key={meta.slug}
            className="absolute flex flex-col items-center justify-center gap-1 p-2 text-center"
            style={{
              left: pct(x, VB_W),
              top: pct(y, VB_H),
              width: pct(CELL_W, VB_W),
              height: pct(CELL_H, VB_H),
            }}
          >
            {isDone(meta.slug) && (
              <span
                className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-base font-black text-white shadow-pop"
                role="img"
                aria-label="Эпоха пройдена"
              >
                ✓
              </span>
            )}
            <span className="text-3xl" aria-hidden="true">
              {meta.icon}
            </span>
            <h3 className="font-display text-sm font-extrabold leading-tight tracking-tight text-primary-900">
              {meta.title}
            </h3>
            <p className="text-xs font-bold text-slate-600">{meta.tagline}</p>
            <button
              type="button"
              onClick={() => router.push(`/epoch/${meta.slug}`)}
              className="mt-1 min-h-[44px] rounded-2xl bg-primary-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-400"
            >
              Войти →
            </button>
          </div>
        )
      })}
    </div>
  )
}
