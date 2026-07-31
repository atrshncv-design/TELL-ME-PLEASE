"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Браузерный TTS через speechSynthesis (замена useAudioPlayer + Kokoro,
 * решение 6 из docs/SPEC-spacezai-live-mvp.md). Озвучка реплик ИИ по
 * предложениям: текст разбивается на предложения и произносится строго
 * последовательно (НЕ параллельно).
 *
 * Прогрессивное улучшение: если браузер не поддерживает speechSynthesis или
 * нет английского голоса — supported = false, speak() молча no-op, текст
 * ответа всё равно показывается на экране (фолбэк).
 */

/** Разбивка на предложения: знаки конца предложения сохраняются. */
function splitSentences(text: string): string[] {
  const parts = text.split(/([.!?…]+)/)
  const sentences: string[] = []
  for (let i = 0; i < parts.length; i += 2) {
    const sentence = (parts[i] + (parts[i + 1] ?? "")).trim()
    if (sentence) sentences.push(sentence)
  }
  return sentences
}

/**
 * Выбор лучшего английского голоса по качеству:
 *   Google UK English → Google US English → Microsoft → Samantha/Aria → любой en.
 * (порядок из TICKETS T02: «Google UK English Male/Female → Microsoft → Siri»)
 */
function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"))
  if (english.length === 0) return null

  const rank = (v: SpeechSynthesisVoice): number => {
    const name = v.name.toLowerCase()
    const lang = v.lang.toLowerCase()
    const isGoogle = name.includes("google")
    const isMicrosoft = name.includes("microsoft")
    const isApple = name.includes("samantha") || name.includes("aria")
    if (isGoogle && lang.startsWith("en-gb")) return 4
    if (isGoogle && lang.startsWith("en-us")) return 3
    if (isMicrosoft) return 2
    if (isApple) return 2
    return 1
  }

  return english.reduce((best, v) => (rank(v) > rank(best) ? v : best))
}

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(false)

  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const queueRef = useRef<string[]>([])
  const speakingRef = useRef(false)
  const supportedRef = useRef(false)

  // Голоса могут загрузиться асинхронно (Chrome: первый getVoices() пустой) —
  // слушаем voiceschanged. Без найденного en-голоса озвучка не включается.
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return
    const synth = window.speechSynthesis
    const load = () => {
      const picked = pickVoice(synth.getVoices())
      voiceRef.current = picked
      supportedRef.current = picked !== null
      setSupported(picked !== null)
    }
    load()
    synth.addEventListener?.("voiceschanged", load)
    return () => synth.removeEventListener?.("voiceschanged", load)
  }, [])

  /** Произнести следующее предложение из очереди (или завершить). */
  const speakNext = useCallback(() => {
    if (typeof window === "undefined") return
    if (queueRef.current.length === 0) {
      speakingRef.current = false
      setSpeaking(false)
      return
    }
    const text = queueRef.current.shift()!
    const synth = window.speechSynthesis
    const utterance = new SpeechSynthesisUtterance(text)
    if (voiceRef.current) {
      utterance.voice = voiceRef.current
      utterance.lang = voiceRef.current.lang
    }
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.onend = () => speakNext()
    utterance.onerror = (e) => {
      // "canceled"/"interrupted" — это наша отмена (stop/новый speak): очередь
      // уже пересоздана, продолжаем из speak(). Прочие сбои — не роняем очередь.
      if (e.error === "canceled" || e.error === "interrupted") return
      speakNext()
    }
    synth.speak(utterance)
  }, [])

  /** Озвучить текст: ставит предложения в очередь и говорит последовательно. */
  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined") return
      if (!supportedRef.current || !text.trim()) return // молчаливый no-op
      const synth = window.speechSynthesis
      // Новый текст заменяет текущую речь — ответы не должны накладываться
      synth.cancel()
      queueRef.current = splitSentences(text)
      if (queueRef.current.length === 0) return
      speakingRef.current = true
      setSpeaking(true)
      speakNext()
    },
    [speakNext],
  )

  /** Остановить озвучку (кнопка/размонтирование). */
  const stop = useCallback(() => {
    if (typeof window === "undefined") return
    window.speechSynthesis.cancel()
    queueRef.current = []
    speakingRef.current = false
    setSpeaking(false)
  }, [])

  // iOS Safari замирает после ~15с непрерывной речи — периодический
  // pause+resume сбрасывает внутренний таймер (стандартный фикс).
  useEffect(() => {
    if (!speaking) return
    const synth = window.speechSynthesis
    const iv = setInterval(() => {
      if (synth.speaking && !synth.paused) {
        synth.pause()
        synth.resume()
      }
    }, 15000)
    return () => clearInterval(iv)
  }, [speaking])

  return { speak, stop, speaking, supported }
}
