"use client"

import { useCallback, useEffect, useRef } from "react"

/**
 * Sound effects hook (decision Q13 — gamification).
 *
 * Short generated WAVs in /public/sounds/. HTMLAudio elements are created and
 * pre-warmed on the first pointerdown (browser autoplay policy: playback is
 * only allowed after a user gesture — answer checks always happen inside one,
 * and the finish fanfare fires shortly after, so it is allowed too).
 * Playback failures are swallowed (sound is decorative, never blocking).
 */

export type SoundName = "correct" | "wrong" | "fanfare"

const FILES: Record<SoundName, string> = {
  correct: "/sounds/correct.wav",
  wrong: "/sounds/wrong.wav",
  fanfare: "/sounds/fanfare.wav",
}

export function useSound() {
  const audioRef = useRef<Record<SoundName, HTMLAudioElement> | null>(null)

  useEffect(() => {
    const warm = () => {
      if (audioRef.current) return
      audioRef.current = {
        correct: new Audio(FILES.correct),
        wrong: new Audio(FILES.wrong),
        fanfare: new Audio(FILES.fanfare),
      }
      for (const a of Object.values(audioRef.current)) {
        a.preload = "auto"
        a.load()
      }
    }
    // Prime on the first user gesture (covers Firefox/Safari autoplay rules).
    window.addEventListener("pointerdown", warm, { once: true })
    return () => window.removeEventListener("pointerdown", warm)
  }, [])

  const play = useCallback((name: SoundName) => {
    // Lazily create on first play in case no pointerdown happened yet
    // (e.g. keyboard-only flow). play() may be rejected until a gesture —
    // that's fine, the catch below swallows it.
    if (!audioRef.current && typeof window !== "undefined") {
      audioRef.current = {
        correct: new Audio(FILES.correct),
        wrong: new Audio(FILES.wrong),
        fanfare: new Audio(FILES.fanfare),
      }
    }
    const a = audioRef.current?.[name]
    if (!a) return
    a.currentTime = 0
    a.play().catch(() => {
      /* autoplay blocked or unsupported — ignore */
    })
  }, [])

  return { play }
}
