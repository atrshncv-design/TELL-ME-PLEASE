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
 * Выбор лучшего английского голоса по качеству И надёжности:
 *   1) ЛОКАЛЬНЫЕ системные голоса (Apple/macOS: Samantha, Daniel, Karen…;
 *      системные TTS) — работают офлайн, без скачивания;
 *   2) Microsoft (локальные на Windows);
 *   3) Google (сетевые, скачиваются по требованию) — ПОСЛЕДНЕЕ средство:
 *      в некоторых сетях серверы Google TTS недоступны, и Chrome молча
 *      не воспроизводит такой голос, хотя API отвечает нормально.
 * Внутри каждой группы предпочитаем en-US / en-GB.
 */
function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"))
  if (english.length === 0) return null

  const rank = (v: SpeechSynthesisVoice): number => {
    const name = v.name.toLowerCase()
    const lang = v.lang.toLowerCase()
    const isGoogle = name.includes("google")
    const isMicrosoft = name.includes("microsoft")
    // Всё, что не Google и не Microsoft, — локальный системный голос
    const group = isGoogle ? 1 : isMicrosoft ? 2 : 3
    const dialect = lang === "en-us" || lang === "en-gb" ? 1 : 0
    return group * 10 + dialect
  }

  return english.reduce((best, v) => (rank(v) > rank(best) ? v : best))
}

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(false)
  const [voiceName, setVoiceName] = useState<string | null>(null)

  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const queueRef = useRef<string[]>([])
  const speakingRef = useRef(false)
  const supportedRef = useRef(false)
  const warmedRef = useRef(false)

  // Голоса могут загрузиться асинхронно (Chrome: первый getVoices() пустой) —
  // слушаем voiceschanged. Без найденного en-голоса озвучка не включается.
  const loadVoices = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return
    const picked = pickVoice(window.speechSynthesis.getVoices())
    voiceRef.current = picked
    supportedRef.current = picked !== null
    setSupported(picked !== null)
    setVoiceName(picked ? picked.name : null)
    // Диагностика: голоса подгружены/изменились
    if (typeof console !== "undefined") {
      console.log(
        `[tts] voices=${window.speechSynthesis.getVoices().length} supported=${picked !== null}` +
          (picked ? ` voice="${picked.name}" (${picked.lang})` : ""),
      )
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return
    const synth = window.speechSynthesis
    loadVoices()
    synth.addEventListener?.("voiceschanged", loadVoices)
    return () => synth.removeEventListener?.("voiceschanged", loadVoices)
  }, [loadVoices])

  // iOS Safari блокирует speechSynthesis без user gesture (жест «протухает»
  // к моменту SSE-done через 5-10с). Стандартный фикс: «прогреть» движок
  // пустым utterance на первом жесте пользователя (тап/клик/клавиша).
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return
    const synth = window.speechSynthesis
    const warm = () => {
      if (warmedRef.current) return
      warmedRef.current = true
      try {
        const u = new SpeechSynthesisUtterance(" ")
        u.volume = 0
        synth.speak(u)
        synth.cancel()
      } catch {
        /* превент не критичен */
      }
    }
    const events = ["pointerdown", "touchstart", "keydown"] as const
    events.forEach((e) => window.addEventListener(e, warm))
    return () => events.forEach((e) => window.removeEventListener(e, warm))
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
    // Chrome-страховка: первый speak() иногда «теряется» (голоса Google
    // скачиваются по требованию). Если за 2.5с произнесение не началось
    // (onstart не сработал) — отменяем и повторяем один раз.
    let started = false
    let retried = false
    utterance.onstart = () => {
      started = true
    }
    synth.speak(utterance)
    setTimeout(() => {
      if (!started && !retried) {
        retried = true
        try {
          synth.cancel()
          synth.speak(utterance)
        } catch {
          /* повтор не критичен */
        }
      }
    }, 2500)
  }, [])

  /** Озвучить текст: ставит предложения в очередь и говорит последовательно. */
  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined") return
      if (!text.trim()) return
      const synth = window.speechSynthesis
      // Голоса могли подгрузиться позже (voiceschanged ещё не пришёл) —
      // пробуем перечитать список перед тем, как сдаться.
      if (!supportedRef.current) {
        loadVoices()
        if (!supportedRef.current) {
          // Диагностика: почему молчим
          if (typeof console !== "undefined") {
            console.warn(`[tts] speak() пропущен: нет английского голоса (voices=${synth.getVoices().length})`)
          }
          return // молчаливый no-op, текст виден на экране
        }
      }
      // Новый текст заменяет текущую речь — ответы не должны накладываться.
      // Превент-utterance здесь НЕ ставим: warm-прогрев уже сделал это на
      // первом жесте, а лишний speak+cancel в одном тике может «съесть»
      // реальную речь (известный глюк Chrome).
      synth.cancel()
      queueRef.current = splitSentences(text)
      if (queueRef.current.length === 0) return
      speakingRef.current = true
      setSpeaking(true)
      // Диагностика: начинаем озвучку
      if (typeof console !== "undefined") {
        console.log(`[tts] speak(${queueRef.current.length} предложений, ${text.length} симв.) voice=${voiceRef.current?.name}`)
      }
      speakNext()
    },
    [loadVoices, speakNext],
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

  return { speak, stop, speaking, supported, voiceName }
}
