"use client"

import { useCallback, useEffect, useRef, useState } from "react"

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

/** localStorage key for the global sound toggle (see SoundToggle.tsx). */
export const SOUND_STORAGE_KEY = "tmp-sound-enabled"

/** True when sound effects are enabled. Default = enabled (no stored value). */
export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true
  return window.localStorage.getItem(SOUND_STORAGE_KEY) !== "false"
}

/**
 * Central speech gate (spec §R04): true when bot speech (browser TTS AND
 * server TTS) may play. Both speech channels check this in their speak()
 * before doing anything — point checks scattered across tasks would be
 * forgotten somewhere. Shares the toggle key with the sound effects.
 */
export function isSpeechAllowed(): boolean {
  return isSoundEnabled()
}

/** Custom event fired when SOUND_STORAGE_KEY changes within this document. */
export const SOUND_GATE_EVENT = "tmp-sound-gate-change"

// SoundToggle persists via localStorage.setItem; same-document writes never
// fire the native "storage" event (that one only reaches OTHER tabs), so we
// shim setItem once to broadcast SOUND_GATE_EVENT locally. The native
// "storage" event still covers changes made in other tabs. No polling.
const WATCH_INSTALLED = "__tmpSoundGateWatchInstalled"

function ensureGateWatch(): void {
  if (typeof window === "undefined") return
  const w = window as unknown as Record<string, unknown>
  if (w[WATCH_INSTALLED] === true) return
  w[WATCH_INSTALLED] = true
  const storage = window.localStorage
  const originalSetItem = storage.setItem.bind(storage)
  try {
    storage.setItem = (key: string, value: string) => {
      originalSetItem(key, value)
      if (key === SOUND_STORAGE_KEY) {
        window.dispatchEvent(new Event(SOUND_GATE_EVENT))
      }
    }
  } catch {
    /* storage sealed/unwritable — speak()-time gating still applies */
  }
}

/**
 * Subscribe to SOUND_STORAGE_KEY changes (same tab via the shim above,
 * other tabs via "storage"). Returns an unsubscribe function.
 */
export function subscribeToSpeechGate(handler: () => void): () => void {
  ensureGateWatch()
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === SOUND_STORAGE_KEY) handler()
  }
  window.addEventListener(SOUND_GATE_EVENT, handler)
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener(SOUND_GATE_EVENT, handler)
    window.removeEventListener("storage", onStorage)
  }
}

/**
 * §R06: координация полноэкранного инструктажа (EpochTheory) и глобального
 * тумблера. Пока модалка открыта, фиксированный тумблер из layout накрывал
 * бы её «✕» — он скрывается, а в шапке модалки стоит свой компактный на том
 * же ключе. Счётчик живёт здесь (общий модуль), чтобы SoundToggle мог взять
 * снапшот при монтировании: эффекты детей (страницы) выполняются РАНЬШЕ
 * эффекта соседа из layout, и «стартовое» событие до подписки не доходит.
 */

/** Custom event fired when an EpochTheory presentation opens/closes
 *  (detail.open = true|false). */
export const EPOCH_THEORY_OPEN_EVENT = "tmp-epoch-theory-open"

let openTheoryInstances = 0

function emitTheoryOpenChange(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent(EPOCH_THEORY_OPEN_EVENT, {
      detail: { open: openTheoryInstances > 0 },
    })
  )
}

/** EpochTheory marks an opened fullscreen presentation (counter-safe for
 *  several mounted instances). */
export function reportEpochTheoryOpen(open: boolean): void {
  openTheoryInstances += open ? 1 : -1
  emitTheoryOpenChange()
}

/** Snapshot for late subscribers (see mount-race note above). */
export function isEpochTheoryOpen(): boolean {
  return openTheoryInstances > 0
}

/**
 * Single source of truth for any sound-toggle UI (the global fixed button
 * AND the compact one in the EpochTheory header): reads, toggles and stays
 * in sync via subscribeToSpeechGate. Persisting still writes localStorage —
 * the shim above broadcasts SOUND_GATE_EVENT to every subscriber.
 */
export function useSoundToggle() {
  const [enabled, setEnabled] = useState(true)

  // Mount-time read avoids hydration mismatch; subscription keeps the value
  // fresh across toggles here and via "storage" events from other tabs.
  useEffect(() => {
    setEnabled(isSoundEnabled())
    return subscribeToSpeechGate(() => setEnabled(isSoundEnabled()))
  }, [])

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev
      window.localStorage.setItem(SOUND_STORAGE_KEY, String(next))
      return next
    })
  }, [])

  return { enabled, toggle }
}

/**
 * R04, дозапрос прогона tester-ux-fixes: единый эффект «выключение звука
 * немедленно глушит активную речь» для ОБОИХ speak-каналов (browser TTS и
 * server TTS). Раньше этот effect дублировался в useSpeechSynthesis и
 * useServerTts — теперь правило живёт в одном месте, рядом с гейтом.
 */
export function useStopSpeechOnGate(stop: () => void): void {
  useEffect(
    () =>
      subscribeToSpeechGate(() => {
        if (!isSpeechAllowed()) stop()
      }),
    [stop],
  )
}

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
      // Skip pre-warming while sound is disabled; the play() path lazily
      // creates the elements once sound is re-enabled, so nothing breaks.
      if (!isSoundEnabled()) return
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
    // Global toggle: no sound at all while disabled (checked per call so a
    // mid-session toggle takes effect immediately).
    if (!isSoundEnabled()) return
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
