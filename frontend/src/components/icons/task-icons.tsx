import type { ReactNode } from "react"

/**
 * Task type icons — inline SVG, 2px monoline stroke, `currentColor` so the
 * parent controls the color (inherits the card text color). Same style as
 * WorldIcon (Lucide icon set, ISC license — see DESIGN.md "Assets" section).
 * Keys match the `type` strings used in the graded task index.json files.
 */
const PATHS: Record<string, ReactNode> = {
  // Circle-help (Lucide) — quiz
  quiz: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </>
  ),
  // Pencil (Feather/Lucide edit) — fill-in
  "fill-in": <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
  // Puzzle (Lucide) — cloze
  cloze: (
    <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z" />
  ),
  // Magnet (Lucide) — drag-and-drop
  "drag-and-drop": (
    <>
      <path d="m6 15-4-4 6.75-6.77a7.79 7.79 0 0 1 11 11L13 22l-4-4 6.39-6.36a2.14 2.14 0 0 0-3-3L6 15" />
      <path d="m5 8 4 4" />
      <path d="m12 15 4 4" />
    </>
  ),
  // Ladder (custom, monoline) — ladder
  ladder: (
    <>
      <path d="M6 3v18" />
      <path d="M18 3v18" />
      <path d="M6 7h12" />
      <path d="M6 11h12" />
      <path d="M6 15h12" />
      <path d="M6 19h12" />
    </>
  ),
  // Wrench (Lucide) — build-sentence
  "build-sentence": (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  ),
  // Theater mask (custom, monoline) — role-play
  "role-play": (
    <>
      <path d="M5 10c0-3.6 2.8-6.5 7-6.5S19 6.4 19 10c0 2.7-1.4 4.8-2.6 6.1V20a2 2 0 0 1-2 2h-4.8a2 2 0 0 1-2-2v-3.9C6.4 14.8 5 12.7 5 10Z" />
      <circle cx="9.5" cy="11" r="1.2" />
      <circle cx="14.5" cy="11" r="1.2" />
      <path d="M9.8 15.6c1.4 1.2 3 1.2 4.4 0" />
    </>
  ),
  // Mic + wave (Lucide mic + custom wave) — fill-in-and-speak
  "fill-in-and-speak": (
    <>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <path d="M12 19v3" />
      <path d="M16.5 8.5a4.5 4.5 0 0 1 0 7" />
    </>
  ),
  // Mic (Lucide) — voice-chat
  "voice-chat": (
    <>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <path d="M12 19v3" />
    </>
  ),
  // Mouse-pointer-click (Lucide) — click-mistake
  "click-mistake": (
    <>
      <path d="m9 9 5 12 1.8-5.2L21 14Z" />
      <path d="M7.2 2.2 8 5.1" />
      <path d="m5.1 8-2.9-.8" />
      <path d="M14 4.1 12 6" />
      <path d="m6 12-1.9 2" />
    </>
  ),
  // Card stack (custom, monoline) — flashcards
  flashcards: (
    <>
      <rect x="6.5" y="6.5" width="13" height="14" rx="2" />
      <rect x="3" y="3" width="13" height="14" rx="2" />
    </>
  ),
  // Roulette wheel (custom, monoline) — wheel
  wheel: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v5.5" />
      <path d="M12 15.5V21" />
      <path d="M3 12h5.5" />
      <path d="M15.5 12H21" />
      <path d="m5.6 5.6 3.9 3.9" />
      <path d="m14.5 14.5 3.9 3.9" />
      <path d="m18.4 5.6-3.9 3.9" />
      <path d="m9.5 14.5-3.9 3.9" />
      <circle cx="16.8" cy="7.2" r="1" />
    </>
  ),
}

/** Neutral fallback for unknown types — list icon (NOT an emoji). */
const DEFAULT_PATHS: ReactNode = (
  <>
    <path d="M8 6h13" />
    <path d="M8 12h13" />
    <path d="M8 18h13" />
    <path d="M3 6h.01" />
    <path d="M3 12h.01" />
    <path d="M3 18h.01" />
  </>
)

/** Task type → icon name (Lucide name or "custom") for reference/debugging. */
export const TASK_TYPE_ICON: Record<string, string> = {
  quiz: "circle-help",
  "fill-in": "pencil",
  cloze: "puzzle",
  "drag-and-drop": "magnet",
  ladder: "ladder (custom)",
  "build-sentence": "wrench",
  "role-play": "theater-mask (custom)",
  "fill-in-and-speak": "mic-wave (custom)",
  "voice-chat": "mic",
  "click-mistake": "mouse-pointer-click",
  flashcards: "card-stack (custom)",
  wheel: "roulette (custom)",
}

export function TaskIcon({ type, className }: { type: string; className?: string }) {
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
      {PATHS[type] ?? DEFAULT_PATHS}
    </svg>
  )
}
