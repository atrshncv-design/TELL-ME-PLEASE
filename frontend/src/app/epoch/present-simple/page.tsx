"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  type EpochProgress,
  type EpochSector,
  type StationProgress,
  epochPercent,
  epochPortalOpenedKey,
  epochStationsDone,
  epochStationsDoneForGrade,
  epochStationsTotal,
  epochTypeById,
  sectorGradeKey,
  sectorPercent,
  sectorStationsDone,
  sectorUnlocked,
} from "@/lib/epoch"
import {
  ACHIEVEMENTS,
  achievementsKey,
  checkAchievements,
  getAchievements,
  type UnlockedAchievement,
} from "@/lib/achievements"
import { useVerbBot } from "@/components/VerbBot"
import { Confetti } from "@/components/Confetti"

/** Иконка-эмодзи по уровню сектора (детерминированно, без Math.random). */
const LEVEL_EMOJI: Record<string, string> = {
  A1: "🚀",
  A2: "🛰️",
  B1: "🕵️",
  B2: "🌌",
}

interface EpochIndexJson {
  epoch: string
  title: string
  subtitle: string
  sectors: EpochSector[]
}

/** Читаем tmp_progress_grade_<N> для каждого сектора (N — из grade сектора).
 *  Станции эпохи пишет стандартный saveTask/useProgress — useProgress не
 *  меняем, читаем оттуда же (T03, Q9). */
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

export default function EpochSectorsPage() {
  const router = useRouter()

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
        console.error("[EpochSectorsPage] Failed to load index.json", err)
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

  // T12 «Геймификация эпохи»: финал «Портал открыт!» — оверлей + Confetti,
  // 1 раз на эпоху (флаг tmp_portal_epoch_present_simple_opened).
  const [showPortalCelebration, setShowPortalCelebration] = useState(false)

  // T12 «Достижения»: разблокированные по grade-ключам (A1→5, A2→6, B1→8,
  // B2→9 — ключ tmp_achievements_grade_N остаётся классовым) + id для тоста.
  const [unlockedByGrade, setUnlockedByGrade] = useState<Record<string, UnlockedAchievement[]>>({})
  const [toastAch, setToastAch] = useState<string | null>(null)
  // Маппинг taskId → тип классовых заданий по grade (мержится с типами станций
  // эпохи — прогресс и ключ достижений общие, см. check-эффект ниже).
  const [classTypeById, setClassTypeById] = useState<Record<string, Record<string, string>>>({})

  const { speakText } = useVerbBot()

  const sectors = data?.sectors ?? []
  const totalStations = epochStationsTotal(sectors)
  const doneStations = epochStationsDone(progress, sectors)
  const epochPct = epochPercent(progress, sectors)

  // Реплики Verb Bot при росте прогресса (паттерн verb-bot:portal-progress,
  // база в провайдере VerbBot) — как карта миров.
  useEffect(() => {
    if (totalStations <= 0) return
    window.dispatchEvent(
      new CustomEvent("verb-bot:portal-progress", {
        detail: { completedCount: doneStations, totalTasks: totalStations },
      })
    )
  }, [doneStations, totalStations])

  // T12: брифинг эпохи при входе на карту секторов (легенда из index.json;
  // задержка, чтобы стандартное приветствие бота не перекрыло брифинг).
  useEffect(() => {
    if (!data) return
    const first = data.sectors[0]
    const briefing = `${data.title}: ${data.subtitle}.${first ? ` ${first.story}` : ""}`
    const t = setTimeout(() => speakText(briefing, "happy", 5000), 1600)
    return () => clearTimeout(t)
  }, [data, speakText])

  // T12: финал «Портал открыт!» при 100% эпохи — один раз (флаг).
  useEffect(() => {
    if (totalStations <= 0 || doneStations < totalStations) return
    try {
      if (localStorage.getItem(epochPortalOpenedKey("present-simple"))) return
      setShowPortalCelebration(true)
    } catch {
      /* ignore unavailable storage */
    }
  }, [doneStations, totalStations])

  const closePortalCelebration = () => {
    try {
      localStorage.setItem(epochPortalOpenedKey("present-simple"), "1")
    } catch {
      /* ignore unavailable storage */
    }
    setShowPortalCelebration(false)
  }

  // T12: классовые index.json по grade-ключам эпохи (5/6/8/9) — типы классовых
  // заданий для достижений. Записи станций и классовых заданий лежат в ОДНОМ
  // tmp_progress_grade_N, поэтому typeById мержится: и те, и другие считаются.
  useEffect(() => {
    if (!data) return
    const grades = [...new Set(data.sectors.map((s) => sectorGradeKey(s)))]
    let cancelled = false
    for (const g of grades) {
      fetch(`/content/tasks/grade_${g}/index.json`)
        .then(async (res) => (res.ok ? res.json() : null))
        .then((j) => {
          if (cancelled || !j || !Array.isArray(j.exercises)) return
          const map: Record<string, string> = {}
          for (const ex of j.exercises) map[ex.file.replace(/\.json$/, "")] = ex.type
          setClassTypeById((prev) => ({ ...prev, [g]: map }))
        })
        .catch(() => {
          /* grade_6/8/9 index.json может отсутствовать — эпоха-типы остаются */
        })
    }
    return () => {
      cancelled = true
    }
  }, [data])

  // T12: гидрация разблокированных достижений по grade-ключам.
  useEffect(() => {
    if (!data) return
    const u: Record<string, UnlockedAchievement[]> = {}
    for (const s of data.sectors) u[sectorGradeKey(s)] = getAchievements(sectorGradeKey(s))
    setUnlockedByGrade(u)
  }, [data])

  // T12: сверяем достижения при каждом изменении прогресса (паттерн «сверка на
  // карте миров» из W3-T4): typeById = станции эпохи (index.json эпохи) +
  // классовые задания того же grade; новые → localStorage + тост.
  useEffect(() => {
    if (!data) return
    for (const g of Object.keys(progress)) {
      const epochTypes = epochTypeById(data.sectors, g)
      const classTypes = classTypeById[g] ?? {}
      const typeById = { ...classTypes, ...epochTypes }
      const fresh = getAchievements(g)
      const news = checkAchievements(progress[g] ?? {}, typeById, fresh)
      if (news.length === 0) continue
      try {
        localStorage.setItem(achievementsKey(g), JSON.stringify([...fresh, ...news]))
      } catch {
        /* ignore unavailable storage */
      }
      setUnlockedByGrade((prev) => ({ ...prev, [g]: [...fresh, ...news] }))
      setToastAch(news[0].id)
    }
  }, [progress, data, classTypeById])

  // T12: короткий тост о новом достижении (4 с, потом сам скрывается).
  useEffect(() => {
    if (!toastAch) return
    const t = setTimeout(() => setToastAch(null), 4000)
    return () => clearTimeout(t)
  }, [toastAch])

  // Активный класс карты секторов — grade сектора с максимальным числом
  // пройденных станций (обычно это класс ученика; значки достижений
  // показываем для него).
  const gradeKeys = Object.keys(progress).filter(
    (g) => Object.keys(progress[g] ?? {}).length > 0
  )
  const activeGrade =
    gradeKeys
      .slice()
      .sort(
        (a, b) =>
          epochStationsDoneForGrade(progress, sectors, b) -
          epochStationsDoneForGrade(progress, sectors, a)
      )[0] ?? "5"
  const activeUnlocked = unlockedByGrade[activeGrade] ?? []

  return (
    <div className="flex flex-col items-center px-4 py-8 max-w-2xl mx-auto">
      {/* Кнопка «← Назад» — к брифингу миссии (стиль TaskHeader). */}
      <button
        onClick={() => router.push("/mission")}
        className="mb-4 flex min-h-[44px] min-w-[44px] items-center justify-center self-start rounded-2xl bg-primary-100 px-3 py-2 text-base font-bold text-primary-700 transition-colors hover:bg-primary-200"
      >
        ← Назад
      </button>

      <h1 className="font-display mb-1 text-3xl font-extrabold tracking-tight text-primary-900">
        {data?.title ?? "Эпоха Present Simple"}
      </h1>
      <p className="mb-2 text-slate-500">{data?.subtitle ?? "База рутины"}</p>
      <p className="mb-4 max-w-md text-center text-sm text-slate-500">
        Катастрофа на космической станции. Нужно восстановить протоколы ежедневной проверки.
      </p>

      {/* Verb Bot реплика при входе (паттерн приветствий миров на карте). */}
      <div className="mb-6 flex w-full items-center gap-2 rounded-2xl border border-primary-100 bg-white/80 px-3 py-2 shadow-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/mascot/happy.jpg"
          alt="Verb Bot"
          className="h-8 w-8 rounded-full object-cover"
        />
        <p className="text-sm font-medium leading-snug text-slate-600">
          Добро пожаловать на базу! Секторы открываются по порядку: пройди все станции
          сектора — и следующий разблокируется.
        </p>
      </div>

      {/* Прогресс эпохи (портал-%, Q10 — теперь по эпохе). */}
      {totalStations > 0 && (
        <div className="mb-6 w-full rounded-2xl border border-primary-200 bg-white/80 px-3 py-2 shadow-soft">
          <div className="mb-1 flex items-center justify-between gap-2 text-sm font-bold">
            <span className="text-primary-800">Портал восстановлен на {epochPct}%</span>
            <span className="text-xs font-semibold text-primary-500">
              {doneStations}/{totalStations}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-primary-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600"
              initial={{ width: 0 }}
              animate={{ width: `${epochPct}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
        </div>
      )}

      {/* T12 «Достижения»: ряд значков под порталом (паттерн карты миров W3-T4) —
          активный класс = grade сектора с максимумом пройденных станций. */}
      <div className="mb-6 w-full rounded-2xl border border-amber-200 bg-white/80 px-3 py-2 shadow-soft">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-sm font-bold">
          <span className="text-amber-700">Достижения</span>
          <span className="text-xs font-semibold text-amber-500/70">{activeGrade} класс</span>
        </div>
        <div className="flex items-center justify-center gap-3">
          {ACHIEVEMENTS.map((a) => {
            const isUnlocked = activeUnlocked.some((u) => u.id === a.id)
            return (
              <div
                key={a.id}
                title={`${a.title} — ${a.description}`}
                aria-label={`${a.title} — ${a.description}`}
                className={`flex h-11 w-11 items-center justify-center rounded-2xl border-2 text-xl transition-colors ${
                  isUnlocked
                    ? "border-amber-300 bg-amber-100 shadow-soft"
                    : "border-slate-200 bg-slate-100 opacity-50 grayscale"
                }`}
              >
                {a.emoji}
              </div>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="w-full text-center">
          <p className="text-slate-600 mb-6">Не удалось загрузить эпоху</p>
          <button
            onClick={() => router.push("/mission")}
            className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm hover:bg-primary-700 transition-colors"
          >
            Назад
          </button>
        </div>
      )}

      {!error && !data && <p className="text-slate-500">Загрузка...</p>}

      {sectors.map((sector, si) => {
        const unlocked = sectorUnlocked(progress, sectors, si)
        const done = sectorStationsDone(progress, sector)
        const pct = sectorPercent(progress, sector)
        const emoji = LEVEL_EMOJI[sector.level] ?? "🛸"
        return (
          <motion.div
            key={sector.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: si * 0.08 }}
            className="relative mb-4 w-full overflow-hidden rounded-3xl border border-primary-200 bg-gradient-to-br from-primary-50/80 via-white to-white px-4 py-4 shadow-sm"
          >
            <div className="mb-3 flex items-start gap-3">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-2xl shadow-soft ${
                  unlocked
                    ? "border-primary-200 bg-primary-50"
                    : "border-slate-200 bg-slate-100 opacity-60 grayscale"
                }`}
              >
                {unlocked ? emoji : "🔒"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-black text-primary-700">
                    {sector.level}
                  </span>
                  <span className="font-display text-lg font-extrabold text-primary-900">
                    {sector.title}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-slate-500">Классы: {sector.grade}</div>
                <div className="mt-1 text-sm leading-snug text-slate-600">{sector.story}</div>
              </div>
            </div>

            {/* Прогресс сектора: N из 4 станций ✓ + полоса. */}
            <div className="mb-2 flex items-center justify-between text-xs font-bold">
              <span className="text-slate-500">
                {done} из {sector.stations.length} станций ✓
              </span>
              <span className="text-primary-600">{pct}%</span>
            </div>
            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-primary-100">
              <motion.div
                className={`h-full rounded-full ${
                  unlocked
                    ? "bg-gradient-to-r from-primary-400 to-primary-600"
                    : "bg-slate-300"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>

            {unlocked ? (
              <button
                onClick={() => router.push(`/epoch/present-simple/${sector.id}`)}
                className="min-h-[44px] w-full rounded-2xl bg-primary-600 px-4 py-2 text-base font-bold text-white transition-colors hover:bg-primary-700"
              >
                Войти в сектор →
              </button>
            ) : (
              <p
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50 text-sm font-bold text-slate-400"
                aria-disabled="true"
              >
                <span aria-hidden="true">🔒</span> Пройди предыдущий сектор
              </p>
            )}
          </motion.div>
        )
      })}

      {/* T12 «Геймификация эпохи»: финальная сцена при 100% эпохи — оверлей
          «Портал открыт!» + конфетти (переиспользуем Confetti). Показывается
          один раз на эпоху: флаг tmp_portal_epoch_present_simple_opened,
          кнопка «Продолжить» закрывает. */}
      {showPortalCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white px-6 py-8 text-center shadow-2xl">
            <Confetti count={40} />
            <div className="relative mb-2 text-6xl">🎉</div>
            <h2 className="font-display relative text-3xl font-extrabold text-primary-900">
              Портал открыт!
            </h2>
            <p className="relative mt-2 text-sm text-slate-500">
              Ты восстановил портал эпохи — все секторы открыты для путешествий!
            </p>
            <button
              onClick={closePortalCelebration}
              className="relative mt-5 min-h-[44px] rounded-2xl bg-primary-600 px-6 py-3 font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
            >
              Продолжить
            </button>
          </div>
        </div>
      )}

      {/* T12: тост о новом достижении (паттерн карты миров W3-T4; сам
          скрывается через 4 с). */}
      {toastAch && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="fixed bottom-24 left-1/2 z-50 w-max max-w-[85vw] -translate-x-1/2 rounded-2xl border-2 border-amber-300 bg-white px-4 py-3 text-center shadow-2xl"
          role="status"
        >
          <div className="text-2xl">🏆</div>
          <div className="text-sm font-extrabold text-amber-700">Новое достижение!</div>
          <div className="text-xs font-semibold text-slate-600">
            {ACHIEVEMENTS.find((a) => a.id === toastAch)?.title}
          </div>
        </motion.div>
      )}
    </div>
  )
}
