"use client"

import Link from "next/link"

interface TaskHeaderProps {
  title: string
  backHref: string
}

export function TaskHeader({ title, backHref }: TaskHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-indigo-100 bg-white/80 backdrop-blur">
      <Link
        href={backHref}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl bg-primary-100 px-3 py-2 text-base font-bold text-primary-700 transition-colors hover:bg-primary-200"
      >
        ← Назад
      </Link>
      <h1 className="font-display truncate text-lg font-extrabold tracking-tight text-primary-900">
        {title}
      </h1>
    </div>
  )
}
