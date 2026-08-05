"use client"

import { useRouter } from "next/navigation"

/**
 * Мини-сетка 12 времён английского языка: 3 времени × 4 аспекта.
 */
const TENSE_ROWS: string[][] = [
  ["Present Simple", "Present Continuous", "Present Perfect", "Present Perfect Continuous"],
  ["Past Simple", "Past Continuous", "Past Perfect", "Past Perfect Continuous"],
  ["Future Simple", "Future Continuous", "Future Perfect", "Future Perfect Continuous"],
]

/**
 * TODO: текст инструктажа может быть заменён вариантом заказчицы.
 */
const INSTRUCTIONS: string[] = [
  "Выбери свой класс и мир — там тебя ждут задания",
  "Выполняй задания и зарабатывай баллы",
  "Не знаешь правило — загляни в таблицу времён",
  "Спрашивай Verb Bot, если что-то непонятно",
]

/**
 * Слот под таблицу времён (временная заглушка).
 *
 * TODO: заменить заглушку на клиентскую картинку таблицы —
 *   <img src="/tenses-table.jpg" alt="Таблица времён" className="w-full rounded-2xl" />
 *   Замена — одной правкой: удали блок ниже (рамку + мини-сетку) и вставь img.
 */
function TensesTable() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-primary-200 bg-white/70 p-4">
      <p className="mb-3 text-center text-sm font-bold text-primary-700">Таблица времён — скоро!</p>
      <div className="grid grid-cols-4 gap-1">
        {TENSE_ROWS.flat().map((name) => (
          <div
            key={name}
            className="flex items-center justify-center rounded-lg border border-primary-100 bg-primary-50 px-1 py-1.5"
          >
            <span className="text-center text-[9px] font-semibold leading-tight text-primary-800">{name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

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

      <TensesTable />

      {/* Блок инструктажа */}
      <section className="rounded-2xl border border-primary-100 bg-white p-4 shadow-soft">
        <h2 className="font-display mb-3 text-lg font-extrabold tracking-tight text-primary-900">
          Как играть
        </h2>
        <ul className="flex flex-col gap-3">
          {INSTRUCTIONS.map((text, i) => (
            <li key={text} className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-black text-primary-700">
                {i + 1}
              </span>
              <span className="pt-1 text-base font-medium leading-snug text-slate-700">{text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Продолжить → на карту миров */}
      <button
        type="button"
        onClick={() => router.push("/class")}
        className="mt-auto min-h-[56px] w-full rounded-2xl bg-primary-600 px-10 py-4 text-lg font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
      >
        Продолжить →
      </button>
    </div>
  )
}
