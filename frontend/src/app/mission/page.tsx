"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { EPOCH_META } from "@/lib/epochs-meta"
import type { EpochProgress, StationProgress } from "@/lib/epoch"
import EpochMapPoster from "@/components/EpochMapPoster"
import ExamEntryCard from "@/components/ExamEntryCard"
import RightsFooter from "@/components/RightsFooter"

/**
 * Карта 12 Эпох — названия, уровни и фокусы из документа
 * «АНГЛ КОНТЕКСТ.md», раздел 4.2 «Карта 12-ти Эпох». Slug и иконка — из
 * пакета «Все Эпохи». Мобильный список берёт каркас из EPOCH_META,
 * фокус/и сюжет — из локального мапа (визуал не меняется). Десктоп
 * (≥1024px) — плакат EpochMapPoster, фолбэк — список.
 * Q2: ВСЕ эпохи активны сразу — никаких замков.
 */

// Фокус и сюжет — только для карточек списка (не едут в плакат).
const EPOCH_EXTRA: Record<string, { focus: string; story: string }> = {
  "present-simple": {
    focus: "Habits, facts. Окончание -s. Do/Does.",
    story: "Катастрофа на космической станции. Нужно восстановить протоколы ежедневной проверки.",
  },
  "present-continuous": {
    focus: "Now, at the moment. To be + V-ing. Орфография -ing.",
    story:
      "Агент подключается к камерам наблюдения в реальном времени. Нужно описать, что происходит прямо сейчас, чтобы координаторы могли спасти людей.",
  },
  "past-simple": {
    focus: "V2, правильные/неправильные глаголы, Did/Didn't.",
    story:
      "База данных прошлого повреждена. Агент должен расшифровать логи того, что произошло вчера, чтобы найти виновника аварии.",
  },
  "past-continuous": {
    focus: "Was/Were + V-ing. Contrast with Past Simple.",
    story:
      "Игрок застревает в моменте прошлого. Нужно описать процесс, который тянулся в тот момент, когда случился сбой.",
  },
  "present-perfect": {
    focus: "Have/Has + V3. Just, already, yet, ever, never. Сравнение с Past Simple.",
    story: "Аномалия настоящего. Результат прошлых действий угрожает базе прямо сейчас.",
  },
  "present-perfect-continuous": {
    focus: "Have/has been + V-ing. Since/for. Акцент на длительность.",
    story: "Процесс начался в прошлом и всё ещё тлеет, угрожая взрывом.",
  },
  "future-simple": {
    focus: "Will / Won't. Predictions, sudden decisions.",
    story: "ИИ предсказывает несколько вариантов развития будущего. Агент должен выбрать правильный сценарий.",
  },
  "future-continuous": {
    focus: "Will be + V-ing.",
    story:
      "Агент попадает в будущее, где люди уже летят на Марс. Нужно описать процесс, который будет происходить в определенный момент в будущем.",
  },
  "past-perfect": {
    focus: 'Had + V3. "Past before past".',
    story:
      "Агент расследует преступление во времени. Нужно понять, что произошло до того, как сработала сигнализация.",
  },
  "future-perfect": {
    focus: "Will have + V3. К концу этого года/к завтрашнему дню.",
    story: "Агент должен запустить протокол спасения до прибытия метеорита.",
  },
  "past-perfect-continuous": {
    focus: "Had been + V-ing.",
    story:
      "Расследование заговора. Выясняется, что шпион вел двойную жизнь задолго до того, как его раскрыли.",
  },
  "future-perfect-continuous": {
    focus: "Will have been + V-ing.",
    story:
      "Финальная битва. Агент должен описать, как долго Машина Времени будет работать к определенному моменту в будущем, чтобы не взорваться.",
  },
}

function EpochList({ onNavigate }: { onNavigate: (slug: string) => void }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl font-black tracking-tight text-primary-900">
        Карта 12 Эпох
      </h2>
      {EPOCH_META.map((epoch) => {
        const extra = EPOCH_EXTRA[epoch.slug] ?? { focus: "", story: "" }
        return (
          <article
            key={epoch.number}
            className="flex flex-col gap-3 rounded-2xl border-2 border-primary-300 bg-white p-4 shadow-pop"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-3xl" aria-hidden="true">
                  {epoch.icon}
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-primary-500">
                    Эпоха {epoch.number}
                  </p>
                  <h3 className="font-display text-lg font-extrabold leading-tight tracking-tight text-primary-900">
                    {epoch.title}
                  </h3>
                  <p className="text-sm font-bold text-slate-700">{epoch.tagline}</p>
                </div>
              </div>
            </div>
            <p className="text-sm font-medium leading-snug text-slate-600">
              <span className="font-bold text-slate-700">Фокус:</span> {extra.focus}
            </p>
            <p className="text-sm font-medium leading-snug text-slate-600">
              <span className="font-bold text-slate-700">Сюжет:</span> {extra.story}
            </p>
            <button
              type="button"
              onClick={() => onNavigate(epoch.slug)}
              className="min-h-[44px] w-full rounded-2xl bg-primary-600 px-4 py-2 text-base font-bold text-white transition-colors hover:bg-primary-700"
            >
              Войти в эпоху →
            </button>
          </article>
        )
      })}
    </section>
  )
}

export default function MissionPage() {
  const router = useRouter()
  const [progress, setProgress] = useState<EpochProgress>({})
  const [posterFailed, setPosterFailed] = useState(false)

  useEffect(() => {
    const grades = ["5", "6", "7", "8", "9"]
    const out: EpochProgress = {}
    for (const g of grades) {
      try {
        const raw = localStorage.getItem(`tmp_progress_grade_${g}`)
        out[g] = raw ? (JSON.parse(raw) as Record<string, StationProgress>) : {}
      } catch {
        out[g] = {}
      }
    }
    setProgress(out)
  }, [])

  const goEpoch = (slug: string) => router.push(`/epoch/${slug}`)

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col gap-5 px-4 py-4 lg:max-w-6xl">
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
              Verb Bot — твой ИИ-навигатор (как JARVIS). Что тебя ждёт: Обучение,
              Миссии, Общение, Квесты, Уровни сложности.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-xl" aria-hidden="true">
              🚀
            </span>
            <span className="pt-0.5 text-base font-medium leading-snug text-slate-700">
              Все 12 эпох открыты сразу! Выбирай любую и начинай путешествие.
            </span>
          </li>
        </ul>
      </section>

      {/* Десктоп: плакат; фолбэк — список */}
      {!posterFailed ? (
        <div className="hidden lg:block">
          <EpochMapPoster progress={progress} onFallback={() => setPosterFailed(true)} />
        </div>
      ) : (
        <div className="hidden lg:block">
          <EpochList onNavigate={goEpoch} />
        </div>
      )}

      {/* Мобильный: прежний вертикальный список без визуальных изменений */}
      <div className="block lg:hidden">
        <EpochList onNavigate={goEpoch} />
      </div>

      {/* Великий экзамен — логическое продолжение: прошёл карту — финал */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-black tracking-tight text-primary-900">
          Великий экзамен — логическое продолжение: прошёл карту — финал
        </h2>
        <p className="text-sm font-medium leading-snug text-slate-600">
          Прошёл карту — финал. Собери все 12 времён в единую систему!
        </p>
        <ExamEntryCard />
      </section>

      <RightsFooter />
    </div>
  )
}
