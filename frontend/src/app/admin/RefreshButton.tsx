"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

/**
 * Кнопка «Обновить» для админ-панели (T05). Страница /admin — server
 * component (force-dynamic), поэтому router.refresh() перезапускает
 * серверный рендер и подтягивает свежий events.jsonl без полной
 * перезагрузки вкладки.
 */
export default function RefreshButton() {
  const router = useRouter()
  const [spinning, setSpinning] = useState(false)

  return (
    <button
      type="button"
      onClick={() => {
        setSpinning(true)
        router.refresh()
        // refresh() не возвращает промис с завершением рендера — снимаем
        // индикатор по короткому таймеру, чтобы кнопка не «зависала».
        setTimeout(() => setSpinning(false), 600)
      }}
      className="rounded-xl border border-primary-200 bg-white px-4 py-2 text-sm font-semibold text-primary-700 shadow-sm transition-colors hover:bg-primary-50 active:scale-95"
    >
      {spinning ? "Обновляю…" : "Обновить"}
    </button>
  )
}
