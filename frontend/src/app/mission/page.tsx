"use client"

import { useRouter } from "next/navigation"

/**
 * Карта 12 Эпох — названия, уровни и фокусы СТРОГО из документа
 * «АНГЛ КОНТЕКСТ.md», раздел 4.2 «Карта 12-ти Эпох». Slug и иконка — из
 * пакета «Все Эпохи» (пак 070826): /epoch/<slug> читает index.json эпохи.
 * Q2: ВСЕ эпохи активны сразу — никаких замков.
 */
const EPOCHS: {
  number: number
  slug: string
  title: string
  level: string
  tagline: string
  icon: string
  focus: string
  story: string
}[] = [
  {
    number: 1,
    slug: "present-simple",
    title: "Present Simple",
    level: "A1",
    tagline: "База рутины",
    icon: "📸",
    focus: "Habits, facts. Окончание -s. Do/Does.",
    story: "Катастрофа на космической станции. Нужно восстановить протоколы ежедневной проверки.",
  },
  {
    number: 2,
    slug: "present-continuous",
    title: "Present Continuous",
    level: "A1+",
    tagline: "Прямой эфир",
    icon: "🎥",
    focus: "Now, at the moment. To be + V-ing. Орфография -ing.",
    story:
      "Агент подключается к камерам наблюдения в реальном времени. Нужно описать, что происходит прямо сейчас, чтобы координаторы могли спасти людей.",
  },
  {
    number: 3,
    slug: "past-simple",
    title: "Past Simple",
    level: "A2",
    tagline: "Архивы истории",
    icon: "📜",
    focus: "V2, правильные/неправильные глаголы, Did/Didn't.",
    story:
      "База данных прошлого повреждена. Агент должен расшифровать логи того, что произошло вчера, чтобы найти виновника аварии.",
  },
  {
    number: 4,
    slug: "past-continuous",
    title: "Past Continuous",
    level: "A2+",
    tagline: "Петля времени",
    icon: "📼",
    focus: "Was/Were + V-ing. Contrast with Past Simple.",
    story:
      "Игрок застревает в моменте прошлого. Нужно описать процесс, который тянулся в тот момент, когда случился сбой.",
  },
  {
    number: 5,
    slug: "present-perfect",
    title: "Present Perfect",
    level: "B1",
    tagline: "Сейсмическая активность",
    icon: "🎒",
    focus: "Have/Has + V3. Just, already, yet, ever, never. Сравнение с Past Simple.",
    story: "Аномалия настоящего. Результат прошлых действий угрожает базе прямо сейчас.",
  },
  {
    number: 6,
    slug: "present-perfect-continuous",
    title: "Present Perfect Continuous",
    level: "B1+",
    tagline: "Тлеющий провод",
    icon: "⏱️",
    focus: "Have/has been + V-ing. Since/for. Акцент на длительность.",
    story: "Процесс начался в прошлом и всё ещё тлеет, угрожая взрывом.",
  },
  {
    number: 7,
    slug: "future-simple",
    title: "Future Simple",
    level: "A2",
    tagline: "Прогноз катастрофы",
    icon: "🔮",
    focus: "Will / Won't. Predictions, sudden decisions.",
    story: "ИИ предсказывает несколько вариантов развития будущего. Агент должен выбрать правильный сценарий.",
  },
  {
    number: 8,
    slug: "future-continuous",
    title: "Future Continuous",
    level: "B1",
    tagline: "Заселение Марса",
    icon: "⏭️",
    focus: "Will be + V-ing.",
    story:
      "Агент попадает в будущее, где люди уже летят на Марс. Нужно описать процесс, который будет происходить в определенный момент в будущем.",
  },
  {
    number: 9,
    slug: "past-perfect",
    title: "Past Perfect",
    level: "B1+",
    tagline: "Эффект бабочки",
    icon: "🎬",
    focus: 'Had + V3. "Past before past".',
    story:
      "Агент расследует преступление во времени. Нужно понять, что произошло до того, как сработала сигнализация.",
  },
  {
    number: 10,
    slug: "future-perfect",
    title: "Future Perfect",
    level: "B2",
    tagline: "Точка невозврата",
    icon: "🏁",
    focus: "Will have + V3. К концу этого года/к завтрашнему дню.",
    story: "Агент должен запустить протокол спасения до прибытия метеорита.",
  },
  {
    number: 11,
    slug: "past-perfect-continuous",
    title: "Past Perfect Continuous",
    level: "B2",
    tagline: "Скрытый мотив",
    icon: "🏃",
    focus: "Had been + V-ing.",
    story:
      "Расследование заговора. Выясняется, что шпион вел двойную жизнь задолго до того, как его раскрыли.",
  },
  {
    number: 12,
    slug: "future-perfect-continuous",
    title: "Future Perfect Continuous",
    level: "C1",
    tagline: "Вечный двигатель",
    icon: "⏱️⏭️",
    focus: "Will have been + V-ing.",
    story:
      "Финальная битва. Агент должен описать, как долго Машина Времени будет работать к определенному моменту в будущем, чтобы не взорваться.",
  },
]

export default function MissionPage() {
  const router = useRouter()

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
              Verb Bot — твой ИИ-навигатор (как JARVIS). Что тебя ждёт: Инструктаж,
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

      {/* Карта 12 Эпох — все активны (Q2, без замков) */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-black tracking-tight text-primary-900">
          Карта 12 Эпох
        </h2>
        {EPOCHS.map((epoch) => (
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
              <span className="font-bold text-slate-700">Фокус:</span> {epoch.focus}
            </p>
            <p className="text-sm font-medium leading-snug text-slate-600">
              <span className="font-bold text-slate-700">Сюжет:</span> {epoch.story}
            </p>
            <button
              type="button"
              onClick={() => router.push(`/epoch/${epoch.slug}`)}
              className="min-h-[44px] w-full rounded-2xl bg-primary-600 px-4 py-2 text-base font-bold text-white transition-colors hover:bg-primary-700"
            >
              Войти в эпоху →
            </button>
          </article>
        ))}
      </section>

      {/* «Великий Экзамен Времен» (Q9) — карточка ведёт на /exam; страницу
          создаёт тикет T14, до него маршрут просто ссылка. */}
      <section className="flex flex-col gap-3">
        <article className="flex flex-col gap-3 rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-4 shadow-pop">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-3xl" aria-hidden="true">
                🏆
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-600">
                  Финальное испытание
                </p>
                <h3 className="font-display text-lg font-extrabold leading-tight tracking-tight text-amber-900">
                  Великий Экзамен Времен
                </h3>
                <p className="text-sm font-bold text-slate-700">
                  12 времён. 4 сектора. Твоя проверка.
                </p>
              </div>
            </div>
          </div>
          <p className="text-sm font-medium leading-snug text-slate-600">
            <span className="font-bold text-slate-700">Испытание:</span> собери все 12
            времён в единую систему и докажи, что ты владеешь временем!
          </p>
          <button
            type="button"
            onClick={() => router.push("/exam")}
            className="min-h-[44px] w-full rounded-2xl bg-amber-500 px-4 py-2 text-base font-bold text-white transition-colors hover:bg-amber-600"
          >
            К Экзамену →
          </button>
        </article>
      </section>
    </div>
  )
}
