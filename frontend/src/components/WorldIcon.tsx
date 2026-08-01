import type { ReactNode } from "react"

/**
 * World icons — inline SVG, 2px monoline stroke, `currentColor` so the
 * parent controls the color (world accent). Hand-picked open-source paths
 * (Lucide icon set, ISC license — see DESIGN.md "Assets" section).
 * Keys match the category strings used across the map of worlds.
 */
export type WorldId = "grammar" | "to-be" | "vocabulary" | "listening" | "speaking"

const PATHS: Record<WorldId, ReactNode> = {
  // Book-open — Долина Грамматики
  grammar: (
    <>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </>
  ),
  // Robot — Город To Be
  "to-be": (
    <>
      <rect x="4" y="7" width="16" height="12" rx="3" />
      <path d="M12 7V4" />
      <circle cx="12" cy="3" r="1.2" />
      <circle cx="9.5" cy="13" r="1.3" />
      <circle cx="14.5" cy="13" r="1.3" />
      <path d="M8.5 16.5c1.9 1.4 5.1 1.4 7 0" />
    </>
  ),
  // Leaf — Лес Слов
  vocabulary: (
    <>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </>
  ),
  // Headphones — Пещера Звуков
  listening: (
    <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
  ),
  // Speech bubble — Вершина Разговоров
  speaking: <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />,
}

export function WorldIcon({ world, className }: { world: WorldId; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[world]}
    </svg>
  )
}
