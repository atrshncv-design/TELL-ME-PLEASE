"use client"

import { useEffect, useState } from "react"
import {
  EPOCH_THEORY_OPEN_EVENT,
  isEpochTheoryOpen,
  useSoundToggle,
} from "@/lib/useSound"

/**
 * Global sound-effects toggle (correct/wrong/fanfare) — fixed top-right
 * corner on every screen. All state lives in useSoundToggle() so this button
 * and the compact EpochTheory-header toggle cannot drift apart.
 *
 * SVG icons (NOT emoji — macOS renders emoji monochrome). Volume-2 / volume-x
 * style speaker glyphs, stroke = currentColor so they follow the button tint.
 *
 * §R06: пока открыт полноэкранный инструктаж EpochTheory, эта кнопка
 * скрывается — модалка показывает собственный компактный тумблер на том же
 * ключе, и фиксированная кнопка накрывала бы её «✕». Координация — событие
 * EPOCH_THEORY_OPEN_EVENT из lib/useSound; app/layout.tsx не трогаем.
 */
export function SoundToggle() {
  const { enabled, toggle } = useSoundToggle()
  const [coveredByEpochTheory, setCoveredByEpochTheory] = useState(false)

  // §R06: hide while the fullscreen epoch-theory modal is open. Effects of
  // page children run BEFORE this sibling-of-layout effect, so the modal's
  // open event can fire pre-subscription — sync from the counter snapshot.
  useEffect(() => {
    const onEpochTheoryOpen = (e: Event) => {
      setCoveredByEpochTheory(
        (e as CustomEvent<{ open?: boolean }>).detail?.open === true
      )
    }
    setCoveredByEpochTheory(isEpochTheoryOpen())
    window.addEventListener(EPOCH_THEORY_OPEN_EVENT, onEpochTheoryOpen)
    return () =>
      window.removeEventListener(EPOCH_THEORY_OPEN_EVENT, onEpochTheoryOpen)
  }, [])

  if (coveredByEpochTheory) return null

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Звук вкл/выкл"
      aria-pressed={enabled}
      className={`fixed z-50 pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border shadow-md backdrop-blur transition-colors active:scale-95 top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] ${
        enabled
          ? "border-primary-200 bg-white/90 text-primary-700 hover:bg-white"
          : "border-slate-200 bg-white/70 text-slate-400 hover:bg-white"
      }`}
    >
      {enabled ? <SpeakerOnIcon /> : <SpeakerOffIcon />}
    </button>
  )
}

/** Compact variant used inside the EpochTheory header (§R06). */
export function SpeakerOnIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

export function SpeakerOffIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  )
}
