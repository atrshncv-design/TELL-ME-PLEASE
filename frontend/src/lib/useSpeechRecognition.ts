"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface UseSpeechRecognitionOptions {
  onResult: (text: string) => void
  enabled?: boolean
  /** pravki-240826 (тикет 02): авто-рестарт после каждой распознанной фразы,
   *  пока пользователь сам не выключил микрофон (режим минутного монолога —
   *  OneMinuteTask). По умолчанию выключено: push-to-talk как раньше. */
  autoRestart?: boolean
}

export function useSpeechRecognition({
  onResult,
  enabled = true,
  autoRestart = false,
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
  const autoRestartRef = useRef(autoRestart)
  autoRestartRef.current = autoRestart
  // pravki-240826 (стабильность): backoff авто-рестарта — при повторяющихся
  // ошибках (сеть и т.п.) пауза растёт вдвое (1с → 8с макс), чтобы не крутить
  // тугой цикл start/ошибка. Успешная реплика или явный start() сбрасывают.
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const consecutiveFailuresRef = useRef(0)
  // Неудачный старт подряд (InvalidStateError и т.п.) — считается отдельно от
  // ошибок распознавания: тоже растит backoff.
  const fatalRef = useRef(false)

  /** Отложить рестарт на backoff-паузу (0 мс при чистой последовательности). */
  const scheduleRestart = () => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
    const failures = consecutiveFailuresRef.current
    const delay = failures === 0 ? 0 : Math.min(1000 * Math.pow(2, failures - 1), 8000)
    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null
      if (!autoRestartRef.current || !userWantsListeningRef.current || !enabledRef.current || fatalRef.current) return
      try {
        recognitionRef.current?.start()
        runningRef.current = true
        setListening(true)
      } catch {
        /* InvalidStateError — рестарт на следующем onend */
        consecutiveFailuresRef.current += 1
      }
    }, delay)
  }

  useEffect(() => {
    const SR =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition)
    if (!SR) return
    setSupported(true)

    const recognition = new SR()
    // continuous=false: движок сам останавливается после первой фразы
    // (push-to-talk). С continuous=true Chrome ждёт 10–30 сек до финального
    // результата — отсюда ощущение «микрофон не работает».
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = "en-US"

    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1]
      if (last.isFinal) {
        const text = last[0].transcript.trim()
        if (text) {
          onResultRef.current(text)
          // Успешная реплика — последовательность сбоев чистая, backoff снят.
          consecutiveFailuresRef.current = 0
          if (!autoRestartRef.current) {
            // Push-to-talk с авто-стопом: реплика распознана и отправлена —
            // выключаем микрофон, чтобы бот не ждал «продолжения» (continuous
            // держит сессию открытой, отсюда зависания на 30+ секунд).
            userWantsListeningRef.current = false
            try {
              recognition.stop()
            } catch {}
          }
          // autoRestart (монолог): намерение слушать сохраняем — движок сам
          // дойдёт до onend, и тот поднимет сессию снова (backoff = 0).
        }
      }
    }

    recognition.onend = () => {
      runningRef.current = false
      // pravki-240826 (тикет 02): в режиме монолога (autoRestart) микрофон
      // поднимается снова, пока ученик не выключил его сам и задание активно.
      // Push-to-talk (по умолчанию) — без рестарта, как раньше.
      // Стабильность: отказ в доступе — фатален, авто-рестартов больше нет.
      if (
        autoRestartRef.current &&
        !fatalRef.current &&
        userWantsListeningRef.current &&
        enabledRef.current
      ) {
        scheduleRestart()
        return
      }
      // БЕЗ авто-рестарта: микрофон включается только кнопкой (push-to-talk).
      setListening(false)
    }

    recognition.onerror = (e: any) => {
      runningRef.current = false
      setListening(false)
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        fatalRef.current = true
        setError("Нет доступа к микрофону. Разрешите доступ в настройках браузера.")
      } else if (e.error === "network") {
        // Сеть/сервис распознавания недоступны — растим backoff (см. onend).
        consecutiveFailuresRef.current += 1
        setError("Ошибка сети при распознавании речи.")
      } else if (e.error === "audio-capture") {
        consecutiveFailuresRef.current += 1
        setError("Микрофон не найден. Проверьте подключение.")
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        consecutiveFailuresRef.current += 1
        setError(`Ошибка распознавания: ${e.error}`)
      }
      // no-speech/aborted — норма в монологе (тишина): не считаем сбоем,
      // рестарт пройдёт сразу (onend уже запланировал).
    }

    recognitionRef.current = recognition

    return () => {
      enabledRef.current = false
      runningRef.current = false
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current)
        restartTimerRef.current = null
      }
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
    // Явный жест пользователя: сбрасываем backoff и фатальный отказ
    // (права могли выдать в настройках с прошлого раза).
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
    consecutiveFailuresRef.current = 0
    fatalRef.current = false
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
    // Отменяем запланированный авто-рестарт (если был).
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
    try {
      recognitionRef.current?.stop()
    } catch {}
    setListening(false)
  }, [])

  return { listening, supported, error, start, stop }
}
