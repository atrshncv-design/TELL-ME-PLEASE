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
  sectorUnlocked,
  stationPassed,
} from "@/lib/epoch"
import { useVerbBot } from "@/components/VerbBot"

interface EpochIndexJson {
  epoch: string
  title: string
  subtitle: string
  sectors: EpochSector[]
}

/** Читаем tmp_progress_grade_<N> для каждого сектора (N — из grade сектора).
 *  Тот же паттерн, что на карте секторов (T03): станции эпохи пишет
 *  стандартный saveTask/useProgress. */
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

/** Тикет T04: карта станций сектора (свободный порядок внутри, Q9). */
export default function SectorStationsPage({
  params,
}: {
  params: Promise<{ sector: string }>
}) {
  const router = useRouter()
  const { sector } = use(params)

  const [data, setData] = useState<EpochIndexJson | null>(null)
  const [error, setError] = useState(false)
  const [progress, setProgress] = useState<EpochProgress>({})

  useEffect(() => {
    let cancelled = false
    fetch("/content/epochs/present-simple/index.json")
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
  }, [])

  // Гидрация прогресса после монтирования (SSR-safe, как useProgress).
  useEffect(() => {
    if (!data) return
    setProgress(readEpochProgress(data.sectors))
  }, [data])

  const sectors = data?.sectors ?? []
  const sectorIndex = sectors.findIndex((s) => s.id === sector)
  const current = sectorIndex >= 0 ? sectors[sectorIndex] : null
  const unlocked = current ? sectorUnlocked(progress, sectors, sectorIndex) : false
  const done = current ? sectorStationsDone(progress, current) : 0

  // T12 «Геймификация эпохи»: Verb Bot произносит брифинг сектора при входе
  // (легенда = story из index.json эпохи; задержка, чтобы стандартное
  // приветствие бота не перекрыло брифинг).
  const { speakText } = useVerbBot()
  useEffect(() => {
    if (!current) return
    const t = setTimeout(() => speakText(current.story, "happy", 5000), 1600)
    return () => clearTimeout(t)
  }, [current, speakText])

  const backToMap = () => router.push("/epoch/present-simple")

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

          {/* Прогресс сектора: N из 4 станций ✓ (lib/epoch.ts). */}
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
                className={`h-full rounded-full ${
                  unlocked
                    ? "bg-gradient-to-r from-primary-400 to-primary-600"
                    : "bg-slate-300"
                }`}
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.round((done / Math.max(1, current.stations.length)) * 100)}%`,
                }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>
          </div>

          {!unlocked && (
            <p
              className="mb-6 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50 text-sm font-bold text-slate-400"
              aria-disabled="true"
            >
              <span aria-hidden="true">🔒</span> Пройди предыдущий сектор, чтобы открыть станции
            </p>
          )}

          {/* 4 станции сектора: свободный порядок (Q9), клик ведёт на задание. */}
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
                  disabled={!unlocked}
                  onClick={() =>
                    router.push(`/epoch/present-simple/${current.id}/${station.id}`)
                  }
                  aria-disabled={!unlocked}
                  className={`flex min-h-[64px] w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                    unlocked
                      ? "border-primary-200 bg-white shadow-soft hover:bg-primary-50 active:bg-primary-100"
                      : "cursor-not-allowed border-slate-200 bg-slate-100 opacity-60 grayscale"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-black ${
                      unlocked ? "bg-primary-100 text-primary-700" : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {unlocked ? si + 1 : "🔒"}
                  </span>
                  <span
                    className={`min-w-0 flex-1 text-base font-bold ${
                      unlocked ? "text-primary-900" : "text-slate-500"
                    }`}
                  >
                    {station.title}
                  </span>
                  {unlocked && passed && (
                    <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-sm font-black text-success">
                      ✓ {entry ? `${entry.score}/${entry.total}` : ""}
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
