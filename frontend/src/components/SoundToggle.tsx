"use client"

import { useCallback, useEffect, useState } from "react"
import { SOUND_STORAGE_KEY } from "@/lib/useSound"

/**
 * Global sound-effects toggle (correct/wrong/fanfare) — fixed top-right
 * corner on every screen. State persists to localStorage under
 * SOUND_STORAGE_KEY (default: enabled); useSound() reads the same key per
 * play() call, so toggling takes effect immediately.
 *
 * SVG icons (NOT emoji — macOS renders emoji monochrome). Volume-2 / volume-x
 * style speaker glyphs, stroke = currentColor so they follow the button tint.
 */

export function SoundToggle() {
  const [enabled, setEnabled] = useState(true)

  // Read persisted state on mount only (avoids hydration mismatch; the flash
  // is one frame at most, and sound itself is already gated by localStorage).
  useEffect(() => {
    setEnabled(window.localStorage.getItem(SOUND_STORAGE_KEY) !== "false")
  }, [])

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev
      window.localStorage.setItem(SOUND_STORAGE_KEY, String(next))
      return next
    })
  }, [])

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

function SpeakerOnIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

function SpeakerOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  )
}
