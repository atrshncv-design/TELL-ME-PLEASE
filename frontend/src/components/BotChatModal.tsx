"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useChatStream, type ChatStreamMessage } from "@/lib/useChatStream"
import { useSpeechSynthesis } from "@/lib/useSpeechSynthesis"
import { useServerTts } from "@/lib/useServerTts"
import { useSpeechRecognition } from "@/lib/useSpeechRecognition"
import { isSpeechAllowed } from "@/lib/useSound"

/**
 * BotChatModal — голосовой чат с Verb Bot по клику на флоат-бота
 * (tester-ux-fixes 01, §R01/G01). Механика та же, что в VoiceChatTask:
 * микрофон → распознанный текст → SSE /api/chat/stream → озвучка ответа
 * (Web Speech → серверный TTS /api/tts). Свободный чат: без таймера сессии
 * и финального фидбека.
 *
 * Персона бота живёт в task_context (см. BRANCH_ID): промпт-роутер отдаёт
 * базовый tutor-промпт по нечисловой ветке, а контекст добавляет характер
 * Verb Bot. Серверные файлы при этом не меняются.
 */

// Нечисловая ветка: resolvePrompt("verb_bot") → grade_7 (дружелюбный репетитор).
const BRANCH_ID = "verb_bot"

const BOT_PERSONA =
  "You ARE Verb Bot — the friendly robot mascot and English tutor of our learning platform. " +
  "Stay in character as Verb Bot at all times. Answer in simple English that a school student understands. " +
  "When the student makes a mistake, gently explain and kindly ask them to try again. " +
  "Never say or admit that you are an AI. Keep replies short and playful (1-3 sentences)."

/** Триггер первого ответа LLM (бот здоровается первым и озвучивает приветствие). */
const HELLO_TRIGGER = "Hi! Please start the conversation and introduce yourself briefly."

const GREETING_BUBBLE = "Привет! Я Verb Bot 🤖 Нажми на микрофон и спроси что-нибудь на английском!"

interface ChatMsgView {
  role: "user" | "ai"
  text: string
}

export function BotChatModal({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMsgView[]>([])
  const [aiText, setAiText] = useState("")
  const [queued, setQueued] = useState<string | null>(null)
  const [textInput, setTextInput] = useState("")
  // TTS недоступен с обеих сторон (нет голоса И сервер молчит) — сообщение + повтор
  const [ttsFailed, setTtsFailed] = useState(false)

  const aiTextRef = useRef("")
  // Детектор «тишины»: ждём звук после sayTracked(); если ни один канал так и
  // не начал говорить — показываем честное уведомление вместо молчания.
  const expectAudioRef = useRef(false)
  const spokeOnceRef = useRef(false)
  const lastSpokenRef = useRef("")
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  const { speak, stop, speaking, supported: ttsSupported } = useSpeechSynthesis()
  const { speak: serverSpeak, stop: serverStop, speaking: serverSpeaking } = useServerTts()

  /** Гибридная озвучка: Web Speech если есть en-голос, иначе серверный TTS. */
  const say = useCallback(
    (text: string) => {
      if (ttsSupported) speak(text)
      else serverSpeak(text)
    },
    [ttsSupported, speak, serverSpeak],
  )

  /** Гибридный стоп: прерывает и Web Speech, и серверный audio. */
  const stopAll = useCallback(() => {
    stop()
    serverStop()
  }, [stop, serverStop])

  const ttsSpeaking = speaking || serverSpeaking

  const sayTracked = useCallback(
    (text: string) => {
      const clean = text.trim()
      if (!clean) return
      lastSpokenRef.current = clean
      setTtsFailed(false)
      // Выключенный звук — НЕ ошибка: реплика остаётся текстом, детектор
      // тишины не вооружается (иначе каждый ответ давал бы ложное
      // «не получилось озвучить»).
      if (!isSpeechAllowed()) return
      spokeOnceRef.current = false
      expectAudioRef.current = true
      say(clean)
    },
    [say],
  )

  // Если через 1.8с после запроса ни один канал не начал говорить — тишина не «норма».
  // При выключенном звуке детектор не работает (mute ≠ сбой озвучки).
  useEffect(() => {
    if (!isSpeechAllowed()) return
    if (ttsSpeaking) {
      spokeOnceRef.current = true
      return
    }
    if (!expectAudioRef.current) return
    const t = setTimeout(() => {
      expectAudioRef.current = false
      if (!spokeOnceRef.current) setTtsFailed(true)
    }, 1800)
    return () => clearTimeout(t)
  }, [ttsSpeaking])

  const handleChatMessage = useCallback(
    (msg: ChatStreamMessage) => {
      switch (msg.type) {
        case "queued":
          setQueued(msg.content)
          break
        case "token":
          setQueued(null)
          aiTextRef.current += msg.content
          setAiText(aiTextRef.current)
          break
        case "done": {
          setQueued(null)
          const full = msg.content || aiTextRef.current
          if (full) {
            setMessages((p) => [...p, { role: "ai", text: full }])
            sayTracked(full)
          }
          aiTextRef.current = ""
          setAiText("")
          break
        }
        case "error":
          setQueued(null)
          setMessages((p) => [...p, { role: "ai", text: `⚠️ ${msg.content}` }])
          break
      }
    },
    [sayTracked],
  )

  const { connected, sending, startSession, send, reset, reconnect } = useChatStream({
    onMessage: handleChatMessage,
  })

  /** Реплика пользователя (голосом или текстом) → стрим к LLM. */
  const submitUser = useCallback(
    (text: string) => {
      const clean = text.trim()
      if (!clean || !connected) return
      setMessages((p) => [...p, { role: "user", text: clean }])
      send(clean)
      aiTextRef.current = ""
      setAiText("")
      setTextInput("")
    },
    [connected, send],
  )

  // Открытие модалки = новая сессия: бот здоровается первым (и озвучивает),
  // страница под модалкой блокируется от скролла. Размонтирование (закрытие)
  // гасит речь/запросы хуков — состояние страницы снаружи не трогается.
  useEffect(() => {
    startSession({ branchId: BRANCH_ID, taskContext: BOT_PERSONA })
    send(HELLO_TRIGGER)
    closeBtnRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prevOverflow
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Escape — явное закрытие с клавиатуры
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  // Стоп озвучки при размонтировании (закрытие модалки)
  useEffect(() => () => stopAll(), [stopAll])

  const { listening, supported: sttSupported, error: sttError, start, stop: stopListening } =
    useSpeechRecognition({
      enabled: !ttsSpeaking,
      onResult: submitUser,
    })

  const toggleMic = () => (listening ? stopListening() : start())
  const muted = ttsSpeaking || queued !== null

  const handleReconnect = () => {
    reset()
    reconnect()
    setMessages([])
    aiTextRef.current = ""
    setAiText("")
    send(HELLO_TRIGGER)
  }

  // Автоскролл ленты вниз при новых репликах/стриминге
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, aiText, queued, sending])

  const micState = !connected ? "offline" : muted ? "muted" : listening ? "listening" : "idle"
  const micConfig = {
    listening: { bg: "bg-red-500 text-white shadow-red-200", title: "Идёт запись. Нажми, чтобы остановить." },
    muted:     { bg: "bg-amber-200 text-amber-700", title: "Verb Bot говорит. Микрофон на паузе." },
    offline:   { bg: "bg-slate-300 text-slate-500 opacity-60 cursor-not-allowed", title: "Нет связи с сервером." },
    idle:      { bg: "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700", title: "Нажми, чтобы говорить." },
  }[micState]
  const statusLabel =
    !connected ? "офлайн" : muted ? "пауза (бот говорит)" : listening ? "слушаю..." : "готов слушать"

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
      {/* Фон-подложка: клик вне окна закрывает чат */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Голосовой чат с Verb Bot"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-white/70 bg-white shadow-2xl sm:h-[82dvh] sm:rounded-3xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-indigo-100 bg-white/90 px-4 py-3">
          <img
            src="/mascot/happy.jpg"
            alt="Verb Bot"
            className="h-10 w-10 shrink-0 rounded-full border-2 border-white object-cover shadow ring-2 ring-primary-300"
          />
          <div className="min-w-0 flex-1">
            <div className="font-display font-extrabold text-primary-900">Verb Bot</div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{connected ? "онлайн" : "офлайн"}</span>
              {ttsSupported ? (
                <span className="text-emerald-600" aria-hidden="true">🔊</span>
              ) : (
                <span className="text-amber-500" title="Озвучка через серверный TTS">🔊</span>
              )}
            </div>
          </div>
          {!connected && (
            <button
              onClick={handleReconnect}
              className="rounded-xl bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-200"
            >
              Переподключиться
            </button>
          )}
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Закрыть чат"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 outline-none transition-colors hover:bg-slate-200 hover:text-slate-700 focus-visible:ring-4 focus-visible:ring-primary-300"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Chat area */}
        <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {messages.length === 0 && !aiText && !queued && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm">
                {GREETING_BUBBLE}
              </div>
            </div>
          )}
          <AnimatePresence>
            {messages.map((m, i) =>
              m.role === "user" ? (
                <motion.div key={i} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex justify-end">
                  <div className="max-w-[85%] rounded-xl bg-indigo-600 px-3 py-2 text-sm text-white">
                    {m.text}
                  </div>
                </motion.div>
              ) : (
                <motion.div key={i} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex justify-start">
                  <div className="max-w-[85%] rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm">
                    {m.text}
                    {/* Повторить озвучку ответа (сервер мог промолчать и т.п.) */}
                    <button
                      onClick={() => sayTracked(m.text)}
                      aria-label="Озвучить ещё раз"
                      title="Озвучить ещё раз"
                      className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 align-middle text-xs text-indigo-600 transition-colors hover:bg-indigo-100"
                    >
                      🔊
                    </button>
                  </div>
                </motion.div>
              ),
            )}
          </AnimatePresence>
          {aiText && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm">
                {aiText}
                <span className="ml-0.5 inline-block h-3 w-1 animate-pulse rounded bg-indigo-400" />
              </div>
            </div>
          )}
          {queued && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm italic text-slate-400 shadow-sm">
                {queued}
              </div>
            </div>
          )}
          {sending && !aiText && !muted && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm shadow-sm">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-2 border-t border-indigo-100 px-4 py-3">
          {/* Статусная «реплика» рядом с маскотом — как в VoiceChatTask */}
          <div className="flex min-h-[32px] items-center gap-2">
            <motion.img
              src={micState === "muted" ? "/mascot/cheer.jpg" : "/mascot/happy.jpg"}
              alt=""
              aria-hidden="true"
              animate={
                micState === "listening"
                  ? { rotate: [0, -8, 8, 0] }
                  : { y: [0, -2, 0] }
              }
              transition={{
                duration: micState === "listening" ? 0.8 : 2.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="h-8 w-8 shrink-0 rounded-full border-2 border-white object-cover shadow"
            />
            <AnimatePresence mode="wait">
              {micState === "listening" ? (
                <motion.span key="listening" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white shadow">
                  Слушаю…
                </motion.span>
              ) : micState === "muted" ? (
                <motion.span key="muted" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                  Говорю…
                </motion.span>
              ) : micState === "idle" ? (
                <motion.span key="idle" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="rounded-full border border-slate-100 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                  Готов слушать
                </motion.span>
              ) : null}
            </AnimatePresence>
          </div>

          {sttSupported ? (
            <>
              {/* Звуковая волна + кнопка микрофона (push-to-talk) */}
              <div className={`flex h-6 items-end gap-[3px] ${listening ? "text-red-500" : muted ? "text-indigo-500" : "text-slate-300"}`} aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1 origin-bottom rounded-full bg-current"
                    style={{ height: 10 + (i % 3) * 6 }}
                    animate={
                      micState === "offline"
                        ? { scaleY: 0.5 }
                        : listening || muted
                          ? { scaleY: [0.35, 1, 0.55, 0.9, 0.35] }
                          : { scaleY: [0.55, 0.8, 0.55] }
                    }
                    transition={
                      micState === "offline"
                        ? {}
                        : { duration: listening ? 0.65 : 2.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }
                    }
                  />
                ))}
              </div>
              <div className="relative">
                {listening && (
                  <motion.span
                    className="absolute inset-0 rounded-full border-2 border-red-400"
                    animate={{ scale: [1, 1.45], opacity: [0.8, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                    aria-hidden="true"
                  />
                )}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleMic}
                  disabled={muted || !connected}
                  title={micConfig.title}
                  aria-label={listening ? "Остановить запись" : "Говорить"}
                  className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors focus-visible:ring-4 focus-visible:ring-primary-300 focus-visible:outline-none ${micConfig.bg}`}
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 10.5v.5a7 7 0 0 0 14 0v-.5" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                  </svg>
                </motion.button>
              </div>
              <div className="min-h-[16px] text-center text-xs text-slate-500">{statusLabel}</div>
            </>
          ) : (
            /* STT недоступен (Firefox и т.п.) — понятное сообщение + текстовый ввод */
            <>
              <div className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
                🎤 Микрофон здесь недоступен. Напиши вопрос текстом — бот ответит голосом:
              </div>
              <div className="flex w-full gap-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitUser(textInput)}
                  placeholder="Напиши на английском..."
                  disabled={!connected}
                  aria-label="Текстовое сообщение для Verb Bot"
                  className="min-h-[44px] flex-1 rounded-xl border-2 border-indigo-200 px-4 py-2 text-base outline-none focus:border-indigo-500 disabled:opacity-50"
                />
                <button
                  onClick={() => submitUser(textInput)}
                  disabled={!connected || !textInput.trim()}
                  className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Отправить
                </button>
              </div>
            </>
          )}

          {sttError && (
            <p className="text-center text-xs text-red-500" role="alert">
              {sttError}{" "}
              <button onClick={toggleMic} className="font-semibold underline">
                Повторить
              </button>
            </p>
          )}

          {ttsFailed && (
            <div className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
              Не получилось озвучить ответ.{" "}
              <button onClick={() => lastSpokenRef.current && sayTracked(lastSpokenRef.current)} className="font-semibold underline">
                🔊 Повторить звук
              </button>
            </div>
          )}

          {ttsSpeaking && (
            <div className="flex items-center gap-1 text-xs text-indigo-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-600" />Озвучиваю...
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
