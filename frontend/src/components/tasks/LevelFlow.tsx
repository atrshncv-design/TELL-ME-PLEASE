/** W3-T4 «Структура уровня Discover→…→Unlock» — лесенка этапов уровня.
 *
 *  Статичная визуальная обёртка поверх карточки задания (для новых типов,
 *  поле `levelFlow: true` в JSON): 7 кружков-этапов (Открой → Выбери →
 *  Собери → Исправь → Скажи → Создай → Награда), заполняются по мере
 *  прохождения шагов ВНУТРИ задания через проп currentStep (компонент
 *  задания сам считает пройденные шаги). Механику заданий НЕ переписывает —
 *  только показывает прогресс-этапы (спека 6, «Структура уровня»).
 *
 *  Чистый презентационный компонент (без хуков и событий) — можно рендерить
 *  и в серверных компонентах, и внутри клиентских заданий.
 */

export interface LevelStep {
  key: string
  label: string
}

/** Канонические этапы уровня (спека 6: Discover→Choose→Build→Fix→Speak→
 *  Create→Unlock) с русскими подписями. */
export const LEVEL_FLOW_STEPS: LevelStep[] = [
  { key: "discover", label: "Открой" },
  { key: "choose", label: "Выбери" },
  { key: "build", label: "Собери" },
  { key: "fix", label: "Исправь" },
  { key: "speak", label: "Скажи" },
  { key: "create", label: "Создай" },
  { key: "unlock", label: "Награда" },
]

interface LevelFlowProps {
  /** Сколько этапов пройдено (0..steps.length); дефолт 0. */
  currentStep?: number
  /** Свои этапы (по умолчанию 7 канонических). */
  steps?: LevelStep[]
}

export function LevelFlow({ currentStep = 0, steps = LEVEL_FLOW_STEPS }: LevelFlowProps) {
  const done = Math.max(0, Math.min(Math.round(currentStep), steps.length))
  return (
    <div className="rounded-2xl border border-primary-100 bg-white/80 px-3 py-2 shadow-soft">
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-primary-500">
        Этапы уровня
      </div>
      {/* Ряд кружков: пройденные — залиты primary, текущий — в кольце,
          будущие — серые. Соединители заполняются вместе с этапом. */}
      <div className="flex items-center">
        {steps.map((s, i) => {
          const isDone = i < done
          const isCurrent = i === done
          return (
            <div key={s.key} className="contents">
              {i > 0 && (
                <div
                  className={`h-0.5 flex-1 rounded-full ${
                    i <= done ? "bg-primary-400" : "bg-slate-200"
                  }`}
                />
              )}
              <div
                title={`Этап ${i + 1}: ${s.label}`}
                aria-label={`Этап ${i + 1}: ${s.label}`}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-black transition-colors ${
                  isDone
                    ? "border-primary-600 bg-gradient-to-br from-primary-500 to-primary-600 text-white"
                    : isCurrent
                      ? "border-primary-600 bg-primary-100 text-primary-700 ring-2 ring-primary-300"
                      : "border-slate-200 bg-slate-100 text-slate-400"
                }`}
              >
                {i + 1}
              </div>
            </div>
          )
        })}
      </div>
      {/* Подписи этапов — в той же сетке, что и кружки */}
      <div className="mt-1 flex">
        {steps.map((s) => (
          <span
            key={s.key}
            className="flex-1 text-center text-[9px] font-semibold leading-tight text-slate-500"
          >
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}
