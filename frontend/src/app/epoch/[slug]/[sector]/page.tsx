"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  type EpochProgress,
  type EpochSector,
  type StationProgress,
  sectorGradeKey,
  sectorStationsDone,
  stationPassed,
} from "@/lib/epoch"
import { useVerbBot } from "@/components/VerbBot"

interface EpochIndexJson {
  epoch: string
  title: string
  subtitle: string
  sectors: EpochSector[]
}

/** Читаем tmp_progress_grade_<N> для каждого сектора (N — из grade сектора). */
function readEpochProgress(sectors: EpochSector[]): EpochProgress {
  const out: EpochProgress = {}
  for (const sector of sectors) {
    const n = sectorGradeKey(sector)
    try {
      const raw = localStorage.getItem(`tmp_progress_grade_${n}`)
      out[n] = raw ? (JSON.parse(raw) as Record<string, StationProgress>) : {}
    } catch {
      out[n] = {}
    }
  }
  return out
}

/**
 * W1-T01: карта станций сектора /epoch/<slug>/<sector>. Динамический аналог
 * T04-страницы (был жёстко /epoch/present-simple/<sector>): slug приходит из
 * URL, станции свободного порядка, Q2 — БЕЗ замка на сектор (все открыты).
 */
export default function SectorStationsPage({
  params,
}: {
  params: Promise<{ slug: string; sector: string }>
}) {
  const router = useRouter()
  const { slug, sector } = use(params)

  const [data, setData] = useState<EpochIndexJson | null>(null)
  const [error, setError] = useState(false)
  const [progress, setProgress] = useState<EpochProgress>({})

  useEffect(() => {
    let cancelled = false
    fetch(`/content/epochs/${slug}/index.json`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as EpochIndexJson
        if (cancelled) return
        setData(json)
      })
      .catch((err) => {
        if (cancelled) return
        console.error("[SectorStationsPage] Failed to load index.json", err)
        setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  // Гидрация прогресса после монтирования (SSR-safe, как useProgress).
  useEffect(() => {
    if (!data) return
    setProgress(readEpochProgress(data.sectors))
  }, [data])

  const sectors = data?.sectors ?? []
  const sectorIndex = sectors.findIndex((s) => s.id === sector)
  const current = sectorIndex >= 0 ? sectors[sectorIndex] : null
  const done = current ? sectorStationsDone(progress, current) : 0

  // T12 «Геймификация эпохи»: Verb Bot произносит брифинг сектора при входе
  // (легенда = story из index.json эпохи).
  const { speakText } = useVerbBot()
  useEffect(() => {
    if (!current || !current.story) return
    const t = setTimeout(() => speakText(current.story, "happy", 5000), 1600)
    return () => clearTimeout(t)
  }, [current, speakText])

  const backToMap = () => router.push(`/epoch/${slug}`)

  return (
    <div className="flex flex-col items-center px-4 py-8 max-w-2xl mx-auto">
      {/* Кнопка «← Назад» — к карте секторов (стиль TaskHeader). */}
      <button
        onClick={backToMap}
        className="mb-4 flex min-h-[44px] min-w-[44px] items-center justify-center self-start rounded-2xl bg-primary-100 px-3 py-2 text-base font-bold text-primary-700 transition-colors hover:bg-primary-200"
      >
        ← Назад
      </button>

      {error && (
        <div className="w-full text-center">
          <p className="text-slate-600 mb-6">Не удалось загрузить эпоху</p>
          <button
            onClick={backToMap}
            className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm hover:bg-primary-700 transition-colors"
          >
            Назад
          </button>
        </div>
      )}

      {!error && !data && <p className="text-slate-500">Загрузка...</p>}

      {!error && data && !current && (
        <div className="w-full text-center">
          <p className="mb-2 text-6xl" aria-hidden="true">
            🛸
          </p>
          <p className="font-display mb-2 text-xl font-extrabold text-primary-900">
            Сектор не найден
          </p>
          <p className="mb-6 text-sm text-slate-500">
            Такого сектора нет на карте. Вернись к карте секторов.
          </p>
          <button
            onClick={backToMap}
            className="min-h-[44px] rounded-2xl bg-primary-600 px-4 py-2 text-base font-bold text-white transition-colors hover:bg-primary-700"
          >
            К карте секторов
          </button>
        </div>
      )}

      {current && (
        <>
          <h1 className="font-display mb-1 text-center text-3xl font-extrabold tracking-tight text-primary-900">
            Сектор {current.level}: {current.title}
          </h1>
          <p className="mb-4 max-w-md text-center text-sm text-slate-500">{current.story}</p>

          {/* Прогресс сектора: N из M станций ✓ (lib/epoch.ts). */}
          <div className="mb-6 w-full rounded-2xl border border-primary-200 bg-white/80 px-3 py-2 shadow-soft">
            <div className="mb-1 flex items-center justify-between gap-2 text-sm font-bold">
              <span className="text-primary-800">
                {done} из {current.stations.length} станций ✓
              </span>
              <span className="text-xs font-semibold text-primary-500">
                {Math.round((done / Math.max(1, current.stations.length)) * 100)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-primary-100">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600"
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.round((done / Math.max(1, current.stations.length)) * 100)}%`,
                }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>
          </div>

          {/* Станции сектора: свободный порядок (Q9), клик ведёт на задание.
              Q2 — все открыты, замков нет. */}
          <div className="grid w-full gap-3">
            {current.stations.map((station, si) => {
              const passed = stationPassed(progress, current, station)
              const entry = progress[sectorGradeKey(current)]?.[station.id]
              return (
                <motion.button
                  key={station.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: si * 0.06 }}
                  onClick={() =>
                    router.push(`/epoch/${slug}/${current.id}/${station.id}`)
                  }
                  className="flex min-h-[64px] w-full items-center gap-3 rounded-2xl border border-primary-200 bg-white px-4 py-3 text-left shadow-soft transition-colors hover:bg-primary-50 active:bg-primary-100"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-black ${
                      passed
                        ? "bg-success text-white"
                        : "bg-primary-100 text-primary-700"
                    }`}
                  >
                    {passed ? "✓" : si + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-base font-bold text-primary-900">
                    {station.title}
                  </span>
                  {passed && (
                    <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-sm font-black text-success">
                      {entry ? `${entry.score}/${entry.total}` : "✓"}
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
