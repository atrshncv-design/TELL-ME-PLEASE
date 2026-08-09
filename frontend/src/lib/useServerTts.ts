"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { stripEmoji } from "@/lib/useSpeechSynthesis"

/**
 * Серверный TTS-фолбэк (Q6, тикет W4-T04): озвучка через /api/tts, когда
 * Web Speech API недоступен или не даёт английских голосов (Яндекс-браузер,
 * Firefox-без-голосов и т.п.). БЕСПЛАТНО, без ключей: /api/tts = edge-tts
 * (Microsoft Edge TTS) → фолбэк translate_tts.
 *
 * API зеркалирует useSpeechSynthesis: { speak, stop, speaking }.
 *   - speak(text): один <audio> с src="/api/tts?text=…&voice=…", play();
 *     speaking=true до onended/onerror.
 *   - stop(): пауза + сброс (как speechSynthesis.cancel()).
 *
 * Автовоспроизведение: браузеры блокируют audio без жеста пользователя —
 * элемент создаётся заранее на первом pointerdown/touchstart/keydown, а к
 * моменту озвучки (старт вопроса/ответ ИИ после клика ученика) у страницы
 * уже есть user activation. Если play() всё же отклонён — молча ждём
 * следующего вызова (текст на экране не пропадает).
 */

export function useServerTts(voice = "en-GB-SoniaNeural") {
  const [speaking, setSpeaking] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const speakingRef = useRef(false)

  /** Завершение воспроизведения (ended/error) — снимаем флаг. */
  const finish = useCallback(() => {
    speakingRef.current = false
    setSpeaking(false)
  }, [])

  /** Один Audio на хук; создаём лениво при первом жесте (см. warm ниже). */
  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio()
      a.preload = "auto"
      a.addEventListener("ended", finish)
      a.addEventListener("error", finish)
      audioRef.current = a
    }
    return audioRef.current
  }, [finish])

  // Прогрев: создать Audio-элемент на первом жесте пользователя (после любого
  // клика/тапа на странице autoplay с звуком разрешён; элемент уже готов).
  useEffect(() => {
    const warm = () => ensureAudio()
    const events = ["pointerdown", "touchstart", "keydown"] as const
    events.forEach((e) => window.addEventListener(e, warm, { once: true, passive: true }))
    return () => events.forEach((e) => window.removeEventListener(e, warm))
  }, [ensureAudio])

  /** Озвучить текст через /api/tts (MP3). Заменяет текущее воспроизведение. */
  const speak = useCallback(
    (text: string) => {
      const clean = stripEmoji(text)
      if (!clean.trim()) return
      const audio = ensureAudio()
      audio.pause()
      audio.src = `/api/tts?text=${encodeURIComponent(clean.slice(0, 500))}&voice=${encodeURIComponent(voice)}`
      speakingRef.current = true
      setSpeaking(true)
      const p = audio.play()
      if (p !== undefined) {
        // Браузер может отклонить play() вне жеста — молча ждём следующего
        // вызова (onerror/finish сбросит флаг; повторный speak() переиграет).
        p.catch(() => {})
      }
    },
    [ensureAudio, voice],
  )

  /** Остановить озвучку (кнопка/размонтирование). */
  const stop = useCallback(() => {
    if (!audioRef.current) return
    audioRef.current.pause()
    audioRef.current.currentTime = 0
    speakingRef.current = false
    setSpeaking(false)
  }, [])

  // Стоп при размонтировании
  useEffect(() => () => stop(), [stop])

  return { speak, stop, speaking }
}
