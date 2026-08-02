"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Confetti } from "@/components/Confetti"
import { useChatStream, type ChatStreamMessage } from "@/lib/useChatStream"
import { useSpeechSynthesis } from "@/lib/useSpeechSynthesis"
import { useSpeechRecognition } from "@/lib/useSpeechRecognition"
import { useAnalytics } from "@/lib/useAnalytics"

interface VoiceChatTaskProps {
  title: string
  description: string
  sections?: { name: string; questions: string[] }[]
  dialogue?: { speaker: string; text: string }[]
  taskContext?: string
  grade?: string
  /** id задания — уходит на бэкенд для выбора роли ИИ (промпт-роутер). */
  taskId?: string
  sessionSeconds?: number
}

/** Приветствия Verb Bot на старте сессии — ротация по hash taskId (чистый рендер, не уходит в стрим). */
const GREETINGS = [
  "Привет! Я Verb Bot — давай поболтаем на английском! 🎙️",
  "Готов слушать и говорить. Поехали!",
  "Не бойся ошибаться — я тоже учусь!",
  "Нажми на микрофон и скажи что-нибудь по-английски!",
]

/** Детерминированный выбор фразы по taskId (стабильно между рендерами/гидрацией). */
function pickGreeting(taskId?: string): string {
  const key = taskId ?? ""
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return GREETINGS[Math.abs(hash) % GREETINGS.length]
}

function VoiceChatInner({
  title,
  description,
  sections,
  dialogue,
  taskContext,
  grade: gradeProp,
  taskId,
  sessionSeconds = 180,
}: VoiceChatTaskProps) {
  const params = useSearchParams()
  const grade = gradeProp || params.get("grade") || "7"

  const { track } = useAnalytics()

  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([])
  const [aiText, setAiText] = useState("")
  const [queued, setQueued] = useState<string | null>(null)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [finalFeedback, setFinalFeedback] = useState("")
  const [timeLeft, setTimeLeft] = useState(sessionSeconds)
  const [textInput, setTextInput] = useState("")
  const [lastAudioPlayed, setLastAudioPlayed] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const aiTextRef = useRef("")
  const sessionEndedRef = useRef(false)
  // 3-мин таймер истёк — финальный запрос отправлен, ввод заблокирован
  const timeUpRef = useRef(false)

  const { speak, stop, speaking, supported: ttsSupported, voiceName } = useSpeechSynthesis()
  // Зеркало speaking для синхронных проверок в обработчиках событий
  const speakingRef = useRef(speaking)
  speakingRef.current = speaking

  // 3-мин таймер СЕССИИ: отсчитывает с момента старта (как в старом бэкенде),
  // НЕ сбрасывается при обмене репликами.
  useEffect(() => {
    if (sessionEnded) return
    const iv = setInterval(() => {
      setTimeLeft((t) => (t <= 1 ? (clearInterval(iv), 0) : t - 1))
    }, 1000)
    return () => clearInterval(iv)
  }, [sessionEnded])

  // Funnel: fire once when a voice session begins (component mounts) and once
  // when it ends (server signals session_ended -> the finale screen). grade is
  // tracked so the future dashboard can break the funnel down by class.
  useEffect(() => {
    track({ event_type: "voice_session_started", grade: Number(grade) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (sessionEnded) track({ event_type: "voice_session_ended", grade: Number(grade) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionEnded])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    return `${m}:${(s % 60).toString().padStart(2, "0")}`
  }

  const handleChatMessage = useCallback(
    (msg: ChatStreamMessage) => {
      switch (msg.type) {
        case "queued":
          // T03: запрос в очереди — показываем реплику «ИИ задумался…»
          setQueued(msg.content)
          break
        case "token":
          // Начался стриминг — очередь снимаем
          setQueued(null)
          aiTextRef.current += msg.content
          setAiText(aiTextRef.current)
          break
        case "done": {
          setQueued(null)
          // Полный ответ (done несёт content) — показываем текстом и озвучиваем
          const full = msg.content || aiTextRef.current
          if (full) {
            setMessages((p) => [...p, { role: "ai", text: full }])
            speak(full)
          }
          aiTextRef.current = ""
          setAiText("")
          break
        }
        case "session_ended":
          setQueued(null)
          sessionEndedRef.current = true
          setSessionEnded(true)
          if (msg.content) setFinalFeedback(msg.content)
          // Без TTS финальный экран показываем сразу (только текст)
          if (!speakingRef.current) setLastAudioPlayed(true)
          break
        case "error":
          setQueued(null)
          setMessages((p) => [...p, { role: "ai", text: `⚠️ ${msg.content}` }])
          // Финальный запрос упал — завершаем сессию мягко (финальный экран)
          if (timeUpRef.current && !sessionEndedRef.current) {
            sessionEndedRef.current = true
            setSessionEnded(true)
            setLastAudioPlayed(true)
          }
          break
      }
    },
    [speak],
  )

  const { connected, sending, startSession, send, sendFinal, reconnect } = useChatStream({
    onMessage: handleChatMessage,
  })

  // Сессия стартует при монтировании (аналог WS-init фазы 1):
  // «connected» = сессия готова, а не сетевое соединение.
  useEffect(() => {
    startSession({ branchId: grade, taskId, taskContext })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // По истечении 180с — финальный запрос с final:true (сервер сам соберёт
  // фидбек и пришлёт session_ended). Срабатывает ровно один раз.
  useEffect(() => {
    if (timeLeft > 0 || sessionEndedRef.current || timeUpRef.current) return
    timeUpRef.current = true
    sendFinal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  // Озвучка фидбека закончилась (и сессия завершена) — показываем финальный экран
  useEffect(() => {
    if (!speaking && sessionEndedRef.current) setLastAudioPlayed(true)
  }, [speaking])

  // Стоп озвучки при размонтировании
  useEffect(() => () => stop(), [stop])

  const { listening, supported, error, start, stop: stopListening } = useSpeechRecognition({
    enabled: !speaking && !sessionEnded && !timeUpRef.current,
    onResult: (text) => {
      if (timeUpRef.current || sessionEndedRef.current) return
      setMessages((p) => [...p, { role: "user", text }])
      send(text)
      aiTextRef.current = ""
      setAiText("")
    },
  })

  const toggleMic = () => (listening ? stopListening() : start())

  // Text-input fallback for browsers where Web Speech API is unavailable (e.g. Firefox).
  // Mirrors the voice `onResult` path: append the user message, send over SSE, clear any partial AI text.
  const handleSendText = () => {
    const text = textInput.trim()
    if (!text || !connected || sessionEnded || timeUpRef.current) return
    setMessages((p) => [...p, { role: "user", text }])
    send(text)
    aiTextRef.current = ""
    setAiText("")
    setTextInput("")
  }

  if (sessionEnded && lastAudioPlayed) {
    return (
      <div className="relative flex flex-col h-[100dvh] items-center justify-center px-6 gap-5 overflow-hidden">
        {/* Праздничный финал: конфетти всегда (сигнал «сессия прошла») */}
        <Confetti count={40} />
        <motion.div
          initial={{ scale: 0, rotate: -25, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 14, delay: 0.15 }}
          className="text-6xl drop-shadow-lg"
        >
          🏆
        </motion.div>
        <h2 className="font-display text-3xl font-extrabold text-primary-900 text-center">Отлично!</h2>
        {finalFeedback ? (
          <p className="text-slate-600 text-center max-w-md">{finalFeedback}</p>
        ) : (
          <p className="text-slate-600 text-center">Ты хорошо поговорил на английском!</p>
        )}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => window.location.reload()}
          className="min-h-[44px] rounded-2xl bg-primary-600 text-white font-bold px-6 py-3 shadow-glow-primary hover:bg-primary-700 active:bg-primary-800 transition-colors"
        >
          ↻ Ещё раз
        </motion.button>
      </div>
    )
  }

  const hasPanel = (dialogue && dialogue.length > 0) || (sections && sections.length > 0)
  // «muted» (микрофон на паузе) = ИИ говорит или ждёт слот в очереди
  const muted = speaking || queued !== null

  return (
    // 100dvh so the mic button stays visible when the mobile address bar
    // shows/hides (100vh collapses under the bar on iOS). The TaskRenderer
    // wrapper provides the gradient page background via min-h-screen; this
    // screen manages its own height within that. max-w-lg keeps it mobile-width
    // on desktop (consistent with other task components).
    <div className="relative flex flex-col h-[100dvh] max-w-lg mx-auto overflow-hidden">
      {/* Театральная сцена: софиты, звёздочки и мягкое свечение (чистый декор под чатом, pointer-events-none) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 512 900" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="vb-spot-l" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fecdd3" stopOpacity="0.55" />
              <stop offset="1" stopColor="#fecdd3" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="vb-spot-r" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fda4af" stopOpacity="0.5" />
              <stop offset="1" stopColor="#fda4af" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="vb-spot-c" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0" stopColor="#ffe4e6" stopOpacity="0.4" />
              <stop offset="1" stopColor="#ffe4e6" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="vb-glow" cx="0.5" cy="0.18" r="0.75">
              <stop offset="0" stopColor="#fff1f2" stopOpacity="0.85" />
              <stop offset="1" stopColor="#fff1f2" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Мягкое свечение сверху */}
          <rect width="512" height="900" fill="url(#vb-glow)" />
          {/* Лучи софитов из верхних углов к центру (speaking-200/300, ~0.25 opacity) */}
          <polygon points="0,0 512,0 340,660 0,660" fill="url(#vb-spot-l)" opacity="0.5" />
          <polygon points="512,0 0,0 172,660 512,660" fill="url(#vb-spot-r)" opacity="0.5" />
          <polygon points="200,0 312,0 256,720 176,720" fill="url(#vb-spot-c)" opacity="0.6" />
          {/* Звёздочки-конфетти */}
          <circle cx="92" cy="130" r="4" fill="#fda4af" opacity="0.55" />
          <circle cx="430" cy="96" r="3" fill="#fecdd3" opacity="0.7" />
          <circle cx="362" cy="228" r="5" fill="#fda4af" opacity="0.35" />
          <circle cx="150" cy="286" r="3" fill="#fecdd3" opacity="0.45" />
          <circle cx="58" cy="430" r="4" fill="#fda4af" opacity="0.3" />
          <circle cx="452" cy="392" r="3.5" fill="#fecdd3" opacity="0.45" />
          <path d="M256 470 l3.5 7.5 7.5 3.5 -7.5 3.5 -3.5 7.5 -3.5 -7.5 -7.5 -3.5 7.5 -3.5z" fill="#fda4af" opacity="0.3" />
          <path d="M110 560 l2.5 5.5 5.5 2.5 -5.5 2.5 -2.5 5.5 -2.5 -5.5 -5.5 -2.5 5.5 -2.5z" fill="#fecdd3" opacity="0.35" />
        </svg>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-indigo-100 bg-white/80">
        <div className="flex items-center gap-2">
          <Link
            href={`/class/${grade}/sections`}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] px-2 py-1 rounded-xl bg-indigo-100 text-indigo-700 font-semibold text-sm hover:bg-indigo-200 transition-colors"
          >
            ←
          </Link>
          <div>
            <div className="font-bold text-indigo-900 text-sm">{title}</div>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              {sessionEnded ? "сессия завершена" : connected ? "онлайн" : "офлайн"}
              {/* Диагностика TTS: видно, есть ли голос на устройстве */}
              {ttsSupported ? (
                <span className="text-emerald-600" title={`Голос: ${voiceName ?? "—"}`}>
                  🔊
                </span>
              ) : (
                <span className="text-rose-500" title="На этом устройстве нет английского голоса — ответы будут только текстом">
                  🔇
                </span>
              )}
              {!connected && !sessionEnded && (
                <button onClick={reconnect} className="text-indigo-600 underline hover:text-indigo-800">
                  Переподключиться
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasPanel && (
            <button onClick={() => setShowPanel(!showPanel)} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
              {showPanel ? "Скрыть" : "Сценарий"}
            </button>
          )}
          {muted && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">🔇</span>}
          <div className={`text-xs font-mono px-2 py-0.5 rounded-full ${timeLeft <= 30 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat area */}
        <div className={`flex-1 flex flex-col ${showPanel ? "border-r border-indigo-100" : ""}`}>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {/* Мем-реплика Verb Bot при старте: чистый рендер, в стрим не уходит */}
            {!sessionEnded && messages.length === 0 && (
              <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex justify-start">
                <div className="max-w-[80%] rounded-xl px-3 py-2 text-sm bg-white text-slate-800 shadow border border-slate-100">
                  {pickGreeting(taskId)}
                </div>
              </motion.div>
            )}
            <AnimatePresence>
              {messages.map((m, i) => (
                <motion.div key={i} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${m.role === "user" ? "bg-indigo-600 text-white" : "bg-white text-slate-800 shadow border border-slate-100"}`}>
                    {m.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {aiText && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-xl px-3 py-2 text-sm bg-white text-slate-800 shadow border border-slate-100">
                  {aiText}<span className="inline-block w-1 h-3 bg-indigo-400 ml-0.5 animate-pulse rounded" />
                </div>
              </div>
            )}
            {/* T03: запрос ждёт слот в очереди — реплика персонажа */}
            {queued && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-xl px-3 py-2 text-sm bg-white text-slate-400 shadow border border-slate-100 italic">
                  {queued}
                  <span className="inline-flex gap-1 ml-1 align-middle">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
            {/* Ждём первый токен от LLM (до начала стрима) */}
            {sending && !aiText && !muted && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-xl px-3 py-2 text-sm bg-white text-slate-400 shadow border border-slate-100">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input area — three branches: mic (Chrome/Edge), text fallback (Firefox), nothing (session ended) */}
          <div className="flex flex-col items-center gap-2 px-4 py-3 border-t border-indigo-100">
            {supported && !sessionEnded && !timeUpRef.current ? (() => {
              // Priority order: offline > muted > listening > idle.
              // Each state gets a distinct color + icon + native tooltip so the user
              // understands WHY the mic isn't reacting when it's disabled.
              const micState = !connected ? "offline" : muted ? "muted" : listening ? "listening" : "idle"
              const micConfig = {
                listening: { bg: "bg-red-500 text-white shadow-red-200", title: "Идёт запись. Нажми, чтобы остановить." },
                muted:     { bg: "bg-amber-200 text-amber-700", title: "ИИ говорит. Микрофон на паузе." },
                offline:   { bg: "bg-slate-300 text-slate-500 opacity-60 cursor-not-allowed", title: "Нет связи с сервером. Проверь, что сервис запущен." },
                idle:      { bg: "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700", title: "Нажми, чтобы говорить." },
              }[micState]
              const statusLabel = !connected ? "офлайн" : muted ? "пауза (ИИ говорит)" : listening ? "слушаю..." : "готов слушать"
              // Волна «живёт» при записи (красная, быстрая) и озвучке (индиго, медленнее); в idle — еле дышит
              const waveActive = micState === "listening" || micState === "muted"
              const waveColor = micState === "listening" ? "text-red-500" : micState === "muted" ? "text-indigo-500" : "text-slate-300"
              return (
                <>
                  {/* Реакция маскота: фото + пузырь состояния */}
                  <div className="flex items-center gap-2 min-h-[40px]">
                    <motion.div
                      animate={
                        micState === "listening"
                          ? { rotate: [0, -8, 8, 0] }
                          : micState === "muted"
                            ? { y: [0, -4, 0] }
                            : { y: [0, -2, 0] }
                      }
                      transition={{ duration: micState === "listening" ? 0.8 : micState === "muted" ? 1.2 : 2.2, repeat: Infinity, ease: "easeInOut" }}
                      className="shrink-0"
                    >
                      <img
                        src={micState === "muted" ? "/mascot/cheer.jpg" : "/mascot/happy.jpg"}
                        alt="Verb Bot"
                        className="h-10 w-10 rounded-full object-cover border-2 border-white shadow"
                      />
                    </motion.div>
                    <AnimatePresence mode="wait">
                      {micState === "listening" ? (
                        <motion.span
                          key="listening"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="text-xs font-semibold text-white bg-red-500 rounded-full px-3 py-1.5 shadow"
                        >
                          Слушаю…
                        </motion.span>
                      ) : micState === "muted" ? (
                        <motion.span
                          key="muted"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="text-xs font-semibold text-indigo-700 bg-indigo-100 rounded-full px-3 py-1.5"
                        >
                          Говорю…
                        </motion.span>
                      ) : micState === "idle" ? (
                        <motion.span
                          key="idle"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="text-xs font-semibold text-slate-600 bg-white border border-slate-100 rounded-full px-3 py-1.5 shadow-sm"
                        >
                          Готов слушать
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </div>

                  {/* Звуковая волна + кнопка микрофона */}
                  <div className="flex flex-col items-center gap-2">
                    <div className={`flex items-end gap-[3px] h-7 ${waveColor}`} aria-hidden>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.span
                          key={i}
                          className="w-1 rounded-full bg-current origin-bottom"
                          style={{ height: 12 + (i % 3) * 7 }}
                          animate={
                            micState === "offline"
                              ? { scaleY: 0.5 }
                              : waveActive
                                ? { scaleY: [0.35, 1, 0.55, 0.9, 0.35] }
                                : { scaleY: [0.55, 0.8, 0.55] }
                          }
                          transition={
                            micState === "offline"
                              ? {}
                              : {
                                  duration: micState === "listening" ? 0.65 : micState === "muted" ? 1.1 : 2.6,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                  delay: i * 0.1,
                                }
                          }
                        />
                      ))}
                    </div>
                    <div className="relative">
                      {/* Пульсирующее кольцо записи */}
                      {micState === "listening" && (
                        <motion.span
                          className="absolute inset-0 rounded-full border-2 border-red-400"
                          animate={{ scale: [1, 1.45], opacity: [0.8, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                        />
                      )}
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        animate={micState === "idle" ? { scale: [1, 1.07, 1] } : { scale: 1 }}
                        transition={micState === "idle" ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" } : {}}
                        onClick={toggleMic}
                        disabled={muted || !connected}
                        title={micConfig.title}
                        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${micConfig.bg}`}
                      >
                        {/* SVG-микрофон (stroke currentColor) */}
                        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <rect x="9" y="2" width="6" height="12" rx="3" />
                          <path d="M5 10.5v.5a7 7 0 0 0 14 0v-.5" />
                          <line x1="12" y1="18" x2="12" y2="22" />
                        </svg>
                      </motion.button>
                    </div>
                    <div className="text-xs text-slate-500 text-center min-h-[16px]">{statusLabel}</div>
                  </div>
                </>
              )
            })() : null}
            {!supported && !sessionEnded && !timeUpRef.current ? (
              <>
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
                  🎤 Голосовая запись доступна в Chrome или Edge. Можно написать ответ текстом:
                </div>
                <div className="flex gap-2 w-full max-w-md">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendText()}
                    placeholder="Напиши ответ на английском..."
                    disabled={!connected}
                    className="flex-1 px-4 py-3 text-base rounded-xl border-2 border-indigo-200 focus:border-indigo-500 outline-none min-h-[48px] disabled:opacity-50"
                  />
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSendText}
                    disabled={!connected || !textInput.trim()}
                    className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700"
                  >
                    Отправить
                  </motion.button>
                </div>
              </>
            ) : null}
            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}
            {muted && (
              <div className="flex items-center gap-1 text-xs text-indigo-600">
                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse" />Озвучиваю ответ...
              </div>
            )}
          </div>
        </div>

        {/* Scenario panel */}
        <AnimatePresence>
          {showPanel && hasPanel && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
              className="overflow-y-auto bg-slate-50 p-3 text-xs">
              <div className="font-bold text-indigo-800 mb-2">Сценарий</div>
              {dialogue && dialogue.length > 0 && (
                <div className="space-y-1 mb-3">
                  {dialogue.map((d, i) => (
                    <div key={i} className={`${d.speaker === "interviewer" ? "text-indigo-600" : "text-green-700"}`}>
                      <b>{d.speaker === "interviewer" ? "Журналист" : d.speaker}:</b> {d.text}
                    </div>
                  ))}
                </div>
              )}
              {sections && sections.length > 0 && (
                <div className="space-y-2">
                  {sections.map((s, i) => (
                    <div key={i}>
                      <div className="font-semibold text-indigo-700">{s.name}</div>
                      <ul className="ml-2 space-y-0.5">
                        {s.questions.map((q, qi) => <li key={qi} className="text-slate-600">• {q}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export function VoiceChatTask(props: VoiceChatTaskProps) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-indigo-600">Загрузка...</div>}>
      <VoiceChatInner {...props} />
    </Suspense>
  )
}
