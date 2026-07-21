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
  const recognitionRef = useRef<any>(null)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  useEffect(() => {
    const SR =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
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
      // Auto-restart if still enabled
      if (enabledRef.current) {
        try {
          recognition.start()
        } catch {}
      } else {
        setListening(false)
      }
    }

    recognition.onerror = () => {
      setListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      enabledRef.current = false
      try {
        recognition.stop()
      } catch {}
    }
  }, [])

  const start = useCallback(() => {
    if (!recognitionRef.current) return
    enabledRef.current = true
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

  return { listening, supported, start, stop }
}
