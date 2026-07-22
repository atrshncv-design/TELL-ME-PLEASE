"use client"

import Link from "next/link"

export default function TaskError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <div className="text-5xl">⚠️</div>
      <h2 className="text-xl font-bold text-red-600">Ошибка загрузки задания</h2>
      <p className="text-slate-600 text-sm text-center max-w-md">
        {error.message || "Произошла непредвиденная ошибка. Попробуйте перезагрузить страницу."}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
        >
          Попробовать снова
        </button>
        <Link
          href="/class"
          className="px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
        >
          ← К разделам
        </Link>
      </div>
    </div>
  )
}
