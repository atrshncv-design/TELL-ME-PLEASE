"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface UseSpeechRecognitionOptions {
  onResult: (text: string) => void
  enabled?: boolean
}

export function useSpeechRecognition({
  onResult,
  enabled = true,
}: UseSpeechRecognitionOptions) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)
  // Mirrors whether recognition.start() has been called and not yet stopped.
  // Guards against InvalidStateError on double-start.
  const runningRef = useRef(false)
  // User intent: true when the user actively wants to listen (called start()),
  // false when they called stop(). Set synchronously, so it is more reliable
  // than deriving state from the async `listening` value.
  const userWantsListeningRef = useRef(false)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  useEffect(() => {
    const SR =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition)
    if (!SR) return
    setSupported(true)

    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = "en-US"

    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1]
      if (last.isFinal) {
        onResultRef.current(last[0].transcript.trim())
      }
    }

    recognition.onend = () => {
      runningRef.current = false
      if (enabledRef.current && !runningRef.current) {
        try {
          recognition.start()
          runningRef.current = true
        } catch (e) {
          // InvalidStateError if already running — log for debugging, don't crash
          console.warn("[useSpeechRecognition] restart failed:", e)
        }
      } else {
        setListening(false)
      }
    }

    recognition.onerror = (e: any) => {
      runningRef.current = false
      setListening(false)
      if (e.error === "not-allowed") {
        setError("Нет доступа к микрофону. Разрешите доступ в настройках браузера.")
      } else if (e.error === "network") {
        setError("Ошибка сети при распознавании речи.")
      } else if (e.error !== "no-speech") {
        setError(`Ошибка распознавания: ${e.error}`)
      }
    }

    recognitionRef.current = recognition

    return () => {
      enabledRef.current = false
      runningRef.current = false
      try {
        recognition.stop()
      } catch {}
    }
  }, [])

  // Handle enabled changes (TTS mute/unmute, session end).
  // Single effect: when pausing, stop recognition but remember user intent;
  // when resuming, restart ONLY if the user actively wanted to listen.
  useEffect(() => {
    if (!enabled) {
      // Pausing (e.g., TTS started): stop recognition but remember user intent
      if (runningRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
        runningRef.current = false
      }
      setListening(false)
    } else {
      // Resuming (e.g., TTS ended): restart ONLY if the user wanted to listen
      if (
        userWantsListeningRef.current &&
        !runningRef.current &&
        recognitionRef.current
      ) {
        try {
          recognitionRef.current.start()
          runningRef.current = true
          setListening(true)
        } catch (e) {
          console.warn("[useSpeechRecognition] resume failed:", e)
        }
      }
    }
  }, [enabled])

  const start = useCallback(() => {
    if (!recognitionRef.current) return
    if (runningRef.current) return // already running, no-op (prevents InvalidStateError)
    enabledRef.current = true
    userWantsListeningRef.current = true
    setError(null)
    try {
      recognitionRef.current.start()
      runningRef.current = true
      setListening(true)
    } catch (e) {
      console.warn("[useSpeechRecognition] start failed:", e)
      setListening(false)
    }
  }, [])

  const stop = useCallback(() => {
    userWantsListeningRef.current = false
    enabledRef.current = false
    runningRef.current = false
    try {
      recognitionRef.current?.stop()
    } catch {}
    setListening(false)
  }, [])

  return { listening, supported, error, start, stop }
}
