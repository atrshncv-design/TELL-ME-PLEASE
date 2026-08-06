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
  epochStationsTotal,
  sectorGradeKey,
} from "@/lib/epoch"
import { Confetti } from "@/components/Confetti"

interface EpochIndexJson {
  epoch: string
  title: string
  subtitle: string
  sectors: EpochSector[]
}

type Epoch = {
  number: number
  title: string
  level: string
  tagline: string
  focus: string
  story: string
  locked: boolean
}

/**
 * Карта 12 Эпох — названия, уровни и фокусы СТРОГО из документа
 * «АНГЛ КОНТЕКСТ.md», раздел 4.2 «Карта 12-ти Эпох».
 */
const EPOCHS: Epoch[] = [
  {
    number: 1,
    title: "Present Simple",
    level: "A1",
    tagline: "База рутины",
    focus: "Habits, facts. Окончание -s. Do/Does.",
    story: "Катастрофа на космической станции. Нужно восстановить протоколы ежедневной проверки.",
    locked: false,
  },
  {
    number: 2,
    title: "Present Continuous",
    level: "A1+",
    tagline: "Прямой эфир",
    focus: "Now, at the moment. To be + V-ing. Орфография -ing.",
    story:
      "Агент подключается к камерам наблюдения в реальном времени. Нужно описать, что происходит прямо сейчас, чтобы координаторы могли спасти людей.",
    locked: true,
  },
  {
    number: 3,
    title: "Past Simple",
    level: "A2",
    tagline: "Архивы истории",
    focus: "V2, правильные/неправильные глаголы, Did/Didn't.",
    story:
      "База данных прошлого повреждена. Агент должен расшифровать логи того, что произошло вчера, чтобы найти виновника аварии.",
    locked: true,
  },
  {
    number: 4,
    title: "Past Continuous",
    level: "A2+",
    tagline: "Петля времени",
    focus: "Was/Were + V-ing. Contrast with Past Simple.",
    story:
      "Игрок застревает в моменте прошлого. Нужно описать процесс, который тянулся в тот момент, когда случился сбой.",
    locked: true,
  },
  {
    number: 5,
    title: "Present Perfect",
    level: "B1",
    tagline: "Сейсмическая активность",
    focus: "Have/Has + V3. Just, already, yet, ever, never. Сравнение с Past Simple.",
    story: "Аномалия настоящего. Результат прошлых действий угрожает базе прямо сейчас.",
    locked: true,
  },
  {
    number: 6,
    title: "Present Perfect Continuous",
    level: "B1+",
    tagline: "Тлеющий провод",
    focus: "Have/has been + V-ing. Since/for. Акцент на длительность.",
    story: "Процесс начался в прошлом и всё ещё тлеет, угрожая взрывом.",
    locked: true,
  },
  {
    number: 7,
    title: "Future Simple",
    level: "A2",
    tagline: "Прогноз катастрофы",
    focus: "Will / Won't. Predictions, sudden decisions.",
    story: "ИИ предсказывает несколько вариантов развития будущего. Агент должен выбрать правильный сценарий.",
    locked: true,
  },
  {
    number: 8,
    title: "Future Continuous",
    level: "B1",
    tagline: "Заселение Марса",
    focus: "Will be + V-ing.",
    story:
      "Агент попадает в будущее, где люди уже летят на Марс. Нужно описать процесс, который будет происходить в определенный момент в будущем.",
    locked: true,
  },
  {
    number: 9,
    title: "Past Perfect",
    level: "B1+",
    tagline: "Эффект бабочки",
    focus: 'Had + V3. "Past before past".',
    story:
      "Агент расследует преступление во времени. Нужно понять, что произошло до того, как сработала сигнализация.",
    locked: true,
  },
  {
    number: 10,
    title: "Future Perfect",
    level: "B2",
    tagline: "Точка невозврата",
    focus: "Will have + V3. К концу этого года/к завтрашнему дню.",
    story: "Агент должен запустить протокол спасения до прибытия метеорита.",
    locked: true,
  },
  {
    number: 11,
    title: "Past Perfect Continuous",
    level: "B2",
    tagline: "Скрытый мотив",
    focus: "Had been + V-ing.",
    story:
      "Расследование заговора. Выясняется, что шпион вел двойную жизнь задолго до того, как его раскрыли.",
    locked: true,
  },
  {
    number: 12,
    title: "Future Perfect Continuous",
    level: "C1",
    tagline: "Вечный двигатель",
    focus: "Will have been + V-ing.",
    story:
      "Финальная битва. Агент должен описать, как долго Машина Времени будет работать к определенному моменту в будущем, чтобы не взорваться.",
    locked: true,
  },
]

export default function MissionPage() {
  const router = useRouter()

  // T12 «Геймификация эпохи»: портал-% активной эпохи (Present Simple) —
  // прогресс станций читается из tmp_progress_grade_N по grade секторов.
  const [epochProgress, setEpochProgress] = useState<{
    done: number
    total: number
    pct: number
  } | null>(null)
  const [showPortalCelebration, setShowPortalCelebration] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/content/epochs/present-simple/index.json")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as EpochIndexJson
      })
      .then((j) => {
        if (cancelled) return
        const sectors = j.sectors
        const progress: EpochProgress = {}
        for (const s of sectors) {
          const n = sectorGradeKey(s)
          try {
            const raw = localStorage.getItem(`tmp_progress_grade_${n}`)
            progress[n] = raw ? (JSON.parse(raw) as Record<string, StationProgress>) : {}
          } catch {
            progress[n] = {}
          }
        }
        const total = epochStationsTotal(sectors)
        const done = epochStationsDone(progress, sectors)
        const pct = epochPercent(progress, sectors)
        setEpochProgress({ done, total, pct })
        // Финал «Портал открыт!» — 1 раз на эпоху (общий флаг с картой
        // секторов: какой экран первым увидит 100%, тот и празднует).
        if (total > 0 && done >= total) {
          try {
            if (!localStorage.getItem(epochPortalOpenedKey("present-simple"))) {
              setShowPortalCelebration(true)
            }
          } catch {
            /* ignore unavailable storage */
          }
        }
      })
      .catch((err) => {
        if (cancelled) return
        console.error("[MissionPage] Failed to load epoch index.json", err)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const closePortalCelebration = () => {
    try {
      localStorage.setItem(epochPortalOpenedKey("present-simple"), "1")
    } catch {
      /* ignore unavailable storage */
    }
    setShowPortalCelebration(false)
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col gap-5 px-4 py-4">
      {/* ← Назад — на лендинг */}
      <button
        type="button"
        onClick={() => router.push("/")}
        aria-label="Назад на главную"
        className="flex min-h-[44px] min-w-[44px] items-center justify-center self-start rounded-2xl bg-primary-100 px-3 py-2 text-base font-bold text-primary-700 transition-colors hover:bg-primary-200"
      >
        ← Назад
      </button>

      <h1 className="font-display text-3xl font-black leading-tight tracking-tight text-primary-900">
        Начнём миссию!
      </h1>

      {/* Легенда Хроно-Агентства */}
      <section className="rounded-2xl border-2 border-primary-200 bg-white p-4 shadow-soft">
        <h2 className="font-display mb-3 text-lg font-extrabold tracking-tight text-primary-900">
          Хроно-Агентство
        </h2>
        <ul className="flex flex-col gap-3">
          <li className="flex items-start gap-3">
            <span className="text-xl" aria-hidden="true">
              🕰️
            </span>
            <span className="pt-0.5 text-base font-medium leading-snug text-slate-700">
              2150 год. Изобретена Машина Времени. Из-за языковых парадоксов временная
              ткань рвётся, создавая аномалии.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-xl" aria-hidden="true">
              🕵️
            </span>
            <span className="pt-0.5 text-base font-medium leading-snug text-slate-700">
              Ты — Хроно-Агент. Путешествуй по эпохам, устраняй грамматические
              аномалии, восстанавливай timeline.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-xl" aria-hidden="true">
              🤖
            </span>
            <span className="pt-0.5 text-base font-medium leading-snug text-slate-700">
              Verb Bot — твой ИИ-навигатор (как JARVIS): брифинги, оценка.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-xl" aria-hidden="true">
              🚀
            </span>
            <span className="pt-0.5 text-base font-medium leading-snug text-slate-700">
              Эпоха Present Simple: «Катастрофа на космической станции. Нужно
              восстановить протоколы ежедневной проверки».
            </span>
          </li>
        </ul>
      </section>

      {/* Карта 12 Эпох */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-black tracking-tight text-primary-900">
          Карта 12 Эпох
        </h2>
        {EPOCHS.map((epoch) => (
          <article
            key={epoch.number}
            className={`flex flex-col gap-3 rounded-2xl border-2 bg-white p-4 ${
              epoch.locked
                ? "border-primary-200 opacity-70"
                : "border-primary-300 shadow-pop"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary-500">
                  Эпоха {epoch.number}
                </p>
                <h3 className="font-display text-lg font-extrabold leading-tight tracking-tight text-primary-900">
                  {epoch.title}
                </h3>
                <p className="text-sm font-bold text-slate-700">{epoch.tagline}</p>
              </div>
              <span className="shrink-0 rounded-full bg-primary-100 px-2.5 py-1 text-xs font-black text-primary-700">
                {epoch.level}
              </span>
            </div>
            <p className="text-sm font-medium leading-snug text-slate-600">
              <span className="font-bold text-slate-700">Фокус:</span> {epoch.focus}
            </p>
            <p className="text-sm font-medium leading-snug text-slate-600">
              <span className="font-bold text-slate-700">Сюжет:</span> {epoch.story}
            </p>
            {epoch.locked ? (
              <p
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50 text-sm font-bold text-slate-400"
                aria-disabled="true"
              >
                <span aria-hidden="true">🔒</span> скоро
              </p>
            ) : (
              <>
                {/* T12 «Геймификация эпохи»: портал-% активной эпохи — стиль
                    карты миров классов (sections/page.tsx W1-T2). */}
                {epochProgress && epochProgress.total > 0 && (
                  <div className="w-full rounded-2xl border border-primary-200 bg-white/80 px-3 py-2 shadow-soft">
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm font-bold">
                      <span className="text-primary-800">
                        Портал восстановлен на {epochProgress.pct}%
                      </span>
                      <span className="text-xs font-semibold text-primary-500">
                        {epochProgress.done}/{epochProgress.total}
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-primary-100">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${epochProgress.pct}%` }}
                        transition={{ type: "spring", stiffness: 120, damping: 20 }}
                      />
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => router.push("/epoch/present-simple")}
                  className="min-h-[44px] w-full rounded-2xl bg-primary-600 px-4 py-2 text-base font-bold text-white transition-colors hover:bg-primary-700"
                >
                  Войти в эпоху →
                </button>
              </>
            )}
          </article>
        ))}
      </section>

      {/* T12 «Геймификация эпохи»: финальная сцена при 100% эпохи — оверлей
          «Портал открыт!» + конфетти, 1 раз на эпоху (общий флаг с картой
          секторов tmp_portal_epoch_present_simple_opened). */}
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
    </div>
  )
}
