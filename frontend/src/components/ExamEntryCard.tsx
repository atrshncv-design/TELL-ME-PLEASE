"use client"

import { useRouter } from "next/navigation"

/** G03: карточка-вход на «Великий Экзамен Времен» — показывается только на
 *  странице эпохи future-perfect-continuous (последнее время). Активна,
 *  когда пройдены все 4 сектора эпохи; иначе приглушена и клик ничего не
 *  делает. Визуал повторяет янтарную карточку экзамена, уходящую с /mission. */
export default function ExamEntryCard({ unlocked }: { unlocked: boolean }) {
  const router = useRouter()

  return (
    <section className="flex w-full flex-col gap-3">
      <article
        className={`flex flex-col gap-3 rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-4 shadow-pop ${
          unlocked ? "" : "opacity-60"
        }`}
      >
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
        {!unlocked && (
          <p className="text-sm font-semibold text-slate-500">
            Сначала пройди Future Perfect Continuous
          </p>
        )}
        <button
          type="button"
          disabled={!unlocked}
          onClick={() => {
            if (unlocked) router.push("/exam")
          }}
          className="min-h-[44px] w-full rounded-2xl bg-amber-500 px-4 py-2 text-base font-bold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:hover:bg-amber-500"
        >
          К Экзамену →
        </button>
      </article>
    </section>
  )
}
