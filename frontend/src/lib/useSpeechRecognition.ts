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
  const wasListeningRef = useRef(false)
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
      if (enabledRef.current) {
        try {
          recognition.start()
        } catch {}
      } else {
        setListening(false)
      }
    }

    recognition.onerror = (e: any) => {
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
      try {
        recognition.stop()
      } catch {}
    }
  }, [])

  // Hard echo protection: immediately stop when enabled becomes false
  useEffect(() => {
    if (!enabled && recognitionRef.current) {
      wasListeningRef.current = true
      enabledRef.current = false
      try {
        recognitionRef.current.stop()
      } catch {}
      setListening(false)
    }
  }, [enabled])

  // Auto-resume when enabled becomes true after being disabled (e.g., after TTS)
  useEffect(() => {
    if (enabled && wasListeningRef.current && recognitionRef.current) {
      wasListeningRef.current = false
      enabledRef.current = true
      try {
        recognitionRef.current.start()
        setListening(true)
      } catch {}
    }
  }, [enabled])

  const start = useCallback(() => {
    if (!recognitionRef.current) return
    enabledRef.current = true
    setError(null)
    try {
      recognitionRef.current.start()
      setListening(true)
    } catch {}
  }, [])

  const stop = useCallback(() => {
    enabledRef.current = false
    try {
      recognitionRef.current?.stop()
    } catch {}
    setListening(false)
  }, [])

  return { listening, supported, error, start, stop }
}
