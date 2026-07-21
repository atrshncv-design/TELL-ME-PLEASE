"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useWebSocket, type WsMessage } from "@/lib/useWebSocket"
import { useSpeechRecognition } from "@/lib/useSpeechRecognition"
import { useAudioPlayer } from "@/lib/useAudioPlayer"

interface ChatMsg {
  role: "user" | "ai"
  text: string
}

const SESSION_SECONDS = 180

function ChatInner() {
  const params = useSearchParams()
  const router = useRouter()
  const grade = params.get("grade") || "7"

  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [aiText, setAiText] = useState("")
  const [muted, setMuted] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [timeLeft, setTimeLeft] = useState(SESSION_SECONDS)
  const aiTextRef = useRef("")
  const [lastAudioPlayed, setLastAudioPlayed] = useState(false)

  // Timer
  useEffect(() => {
    if (sessionEnded) return
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [sessionEnded])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  // Track when last audio finishes playing after session_ended
  const sessionEndedRef = useRef(false)

  const { playing, enqueue } = useAudioPlayer({
    onPlaybackStart: () => setMuted(true),
    onPlaybackEnd: () => {
      setMuted(false)
      if (sessionEndedRef.current) {
        setLastAudioPlayed(true)
      }
    },
  })

  const handleWsMessage = useCallback(
    (msg: WsMessage) => {
      switch (msg.type) {
        case "token":
          aiTextRef.current += msg.content
          setAiText(aiTextRef.current)
          break
        case "audio":
          enqueue(msg.content)
          break
        case "done":
          if (aiTextRef.current) {
            setMessages((prev) => [...prev, { role: "ai", text: aiTextRef.current }])
          }
          aiTextRef.current = ""
          setAiText("")
          break
        case "session_ended":
          sessionEndedRef.current = true
          setSessionEnded(true)
          // Final AI message will come via "done" before this
          break
      }
    },
    [enqueue]
  )

  const { connected, send } = useWebSocket({
    branchId: grade,
    onMessage: handleWsMessage,
  })

  const { listening, supported, start, stop } = useSpeechRecognition({
    enabled: !muted && !sessionEnded,
    onResult: (text) => {
      setMessages((prev) => [...prev, { role: "user", text }])
      send(text)
      aiTextRef.current = ""
      setAiText("")
    },
  })

  const toggleMic = () => (listening ? stop() : start())

  // Show completion screen after last audio played
  if (sessionEnded && lastAudioPlayed) {
    return (
      <div className="flex flex-col h-screen max-w-lg mx-auto items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-6 text-center"
        >
          <div className="text-6xl">🎉</div>
          <h1 className="text-3xl font-bold text-indigo-900">Урок завершён!</h1>
          <p className="text-slate-600 max-w-sm">
            Ты отлично пообщался на английском. Продолжай практиковаться!
          </p>
          <button
            onClick={() => router.push(`/class/${grade}/sections`)}
            className="mt-4 rounded-2xl bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-xl active:scale-95"
          >
            К выбору разделов →
          </button>
        </motion.div>
      </div>
    )
  }

  // Show timer warning when session ended but audio still playing
  const showWaiting = sessionEnded && !lastAudioPlayed

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-indigo-100 bg-white/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <div>
            <div className="font-bold text-indigo-900">AI Avatar</div>
            <div className="text-xs text-slate-500">
              {grade} класс • {connected ? "онлайн" : "офлайн"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {muted && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
              🔇
            </span>
          )}
          <div
            className={`text-sm font-mono px-3 py-1 rounded-full ${
              timeLeft <= 30
                ? "bg-red-100 text-red-700"
                : timeLeft <= 60
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <AnimatePresence>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-md"
                    : "bg-white text-slate-800 shadow border border-slate-100 rounded-bl-md"
                }`}
              >
                {m.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {aiText && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl rounded-bl-md px-4 py-2 bg-white text-slate-800 shadow border border-slate-100">
              {aiText}
              <span className="inline-block w-1.5 h-4 bg-indigo-400 ml-0.5 animate-pulse rounded" />
            </div>
          </div>
        )}

        {showWaiting && (
          <div className="flex justify-center">
            <div className="text-sm text-slate-500 animate-pulse">
              Аватар прощается...
            </div>
          </div>
        )}
      </div>

      {/* Mic button */}
      <div className="flex items-center justify-center gap-4 px-4 py-6 border-t border-indigo-100 bg-white/80 backdrop-blur">
        {supported && !sessionEnded ? (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleMic}
            disabled={muted || !connected}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-lg transition-all ${
              listening
                ? "bg-red-500 text-white shadow-red-200 animate-pulse"
                : muted
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700"
            }`}
          >
            {listening ? "⏹" : "🎤"}
          </motion.button>
        ) : sessionEnded ? null : (
          <div className="text-sm text-slate-500">
            Web Speech API не поддерживается
          </div>
        )}

        {playing && (
          <div className="flex items-center gap-1 text-sm text-indigo-600">
            <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
            Воспроизведение...
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <div className="text-indigo-600 animate-pulse">Загрузка...</div>
        </div>
      }
    >
      <ChatInner />
    </Suspense>
  )
}
