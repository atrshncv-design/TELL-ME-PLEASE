"use client"

import Link from "next/link"

interface TaskHeaderProps {
  title: string
  backHref: string
}

export function TaskHeader({ title, backHref }: TaskHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-indigo-100 bg-white/80">
      <Link
        href={backHref}
        className="flex items-center justify-center min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-indigo-100 text-indigo-700 font-semibold text-base hover:bg-indigo-200 transition-colors"
      >
        ← Назад
      </Link>
      <h1 className="text-lg font-bold text-indigo-900 truncate">{title}</h1>
    </div>
  )
}
