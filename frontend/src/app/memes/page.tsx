"use client"

import { useRouter } from "next/navigation"

export default function MemesPage() {
  const router = useRouter()

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col gap-5 px-4 py-4">
      {/* Шапка: ← Назад (на лендинг) + заголовок */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="Назад на главную"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl bg-primary-100 px-3 py-2 text-base font-bold text-primary-700 transition-colors hover:bg-primary-200"
        >
          ← Назад
        </button>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-primary-900">
          Мемы
        </h1>
      </div>

      {/* Постер из 12 мемов про английские времена — во всю ширину колонки */}
      <img
        src="/memes/poster.jpg"
        alt="Постер из 12 смешных мемов про английские времена: Present, Past и Future"
        draggable={false}
        className="block w-full rounded-2xl shadow-soft"
      />
    </div>
  )
}
