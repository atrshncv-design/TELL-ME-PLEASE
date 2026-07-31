"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
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

  const { speak, stop, speaking, supported: ttsSupported } = useSpeechSynthesis()
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
        case "token":
          aiTextRef.current += msg.content
          setAiText(aiTextRef.current)
          break
        case "done": {
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
          sessionEndedRef.current = true
          setSessionEnded(true)
          if (msg.content) setFinalFeedback(msg.content)
          // Без TTS финальный экран показываем сразу (только текст)
          if (!speakingRef.current) setLastAudioPlayed(true)
          break
        case "error":
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
      <div className="flex flex-col h-[100dvh] items-center justify-center px-6 gap-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-5xl">🎉</motion.div>
        <h2 className="text-2xl font-bold text-indigo-900">Отлично!</h2>
        {finalFeedback ? (
          <p className="text-slate-600 text-center max-w-md">{finalFeedback}</p>
        ) : (
          <p className="text-slate-600">Ты хорошо поговорил на английском!</p>
        )}
      </div>
    )
  }

  const hasPanel = (dialogue && dialogue.length > 0) || (sections && sections.length > 0)
  // «muted» (микрофон на паузе) = ИИ говорит
  const muted = speaking

  return (
    // 100dvh so the mic button stays visible when the mobile address bar
    // shows/hides (100vh collapses under the bar on iOS). The TaskRenderer
    // wrapper provides the gradient page background via min-h-screen; this
    // screen manages its own height within that. max-w-lg keeps it mobile-width
    // on desktop (consistent with other task components).
    <div className="flex flex-col h-[100dvh] max-w-lg mx-auto">
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
                listening: { icon: "⏹", bg: "bg-red-500 text-white shadow-red-200 animate-pulse", title: "Идёт запись. Нажми, чтобы остановить." },
                muted:     { icon: "🔇", bg: "bg-amber-200 text-amber-700", title: "ИИ говорит. Микрофон на паузе." },
                offline:   { icon: "🎤", bg: "bg-slate-300 text-slate-500 opacity-60 cursor-not-allowed", title: "Нет связи с сервером. Проверь, что сервис запущен." },
                idle:      { icon: "🎤", bg: "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700", title: "Нажми, чтобы говорить." },
              }[micState]
              const statusLabel = !connected ? "офлайн" : muted ? "пауза (ИИ говорит)" : listening ? "слушаю..." : ""
              return (
                <>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleMic}
                    disabled={muted || !connected}
                    title={micConfig.title}
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-lg transition-all ${micConfig.bg}`}
                  >
                    {micConfig.icon}
                  </motion.button>
                  <div className="text-xs text-slate-500 text-center min-h-[16px]">{statusLabel}</div>
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
