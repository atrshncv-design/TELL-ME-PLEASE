"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useWebSocket, type WsMessage } from "@/lib/useWebSocket"
import { useSpeechRecognition } from "@/lib/useSpeechRecognition"
import { useAudioPlayer } from "@/lib/useAudioPlayer"

interface VoiceChatTaskProps {
  title: string
  description: string
  sections?: { name: string; questions: string[] }[]
  dialogue?: { speaker: string; text: string }[]
  taskContext?: string
  sessionSeconds?: number
}

function VoiceChatInner({
  title,
  description,
  sections,
  dialogue,
  taskContext,
  sessionSeconds = 180,
}: VoiceChatTaskProps) {
  const params = useSearchParams()
  const grade = params.get("grade") || "7"

  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([])
  const [aiText, setAiText] = useState("")
  const [muted, setMuted] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [timeLeft, setTimeLeft] = useState(sessionSeconds)
  const aiTextRef = useRef("")
  const sessionEndedRef = useRef(false)
  const [lastAudioPlayed, setLastAudioPlayed] = useState(false)
  const [showPanel, setShowPanel] = useState(false)

  useEffect(() => {
    if (sessionEnded) return
    const iv = setInterval(() => {
      setTimeLeft((t) => (t <= 1 ? (clearInterval(iv), 0) : t - 1))
    }, 1000)
    return () => clearInterval(iv)
  }, [sessionEnded])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    return `${m}:${(s % 60).toString().padStart(2, "0")}`
  }

  const { playing, enqueue } = useAudioPlayer({
    onPlaybackStart: () => setMuted(true),
    onPlaybackEnd: () => {
      setMuted(false)
      if (sessionEndedRef.current) setLastAudioPlayed(true)
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
            setMessages((p) => [...p, { role: "ai", text: aiTextRef.current }])
          }
          aiTextRef.current = ""
          setAiText("")
          break
        case "session_ended":
          sessionEndedRef.current = true
          setSessionEnded(true)
          break
      }
    },
    [enqueue]
  )

  const { connected, send } = useWebSocket({ branchId: grade, onMessage: handleWsMessage, taskContext })

  const { listening, supported, start, stop } = useSpeechRecognition({
    enabled: !muted && !sessionEnded,
    onResult: (text) => {
      setMessages((p) => [...p, { role: "user", text }])
      send(text)
      aiTextRef.current = ""
      setAiText("")
    },
  })

  const toggleMic = () => (listening ? stop() : start())

  if (sessionEnded && lastAudioPlayed) {
    return (
      <div className="flex flex-col h-full items-center justify-center px-6 gap-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-5xl">🎉</motion.div>
        <h2 className="text-2xl font-bold text-indigo-900">Отлично!</h2>
        <p className="text-slate-600">Ты хорошо поговорил на английском!</p>
      </div>
    )
  }

  const hasPanel = (dialogue && dialogue.length > 0) || (sections && sections.length > 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-indigo-100 bg-white/80">
        <div>
          <div className="font-bold text-indigo-900 text-sm">{title}</div>
          <div className="text-xs text-slate-500">{connected ? "онлайн" : "офлайн"}</div>
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
          </div>

          {/* Mic */}
          <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-indigo-100">
            {supported && !sessionEnded ? (
              <motion.button whileTap={{ scale: 0.9 }} onClick={toggleMic} disabled={muted || !connected}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-lg transition-all ${listening ? "bg-red-500 text-white shadow-red-200 animate-pulse" : muted ? "bg-slate-200 text-slate-400" : "bg-indigo-600 text-white shadow-indigo-200"}`}>
                {listening ? "⏹" : "🎤"}
              </motion.button>
            ) : null}
            {playing && (
              <div className="flex items-center gap-1 text-xs text-indigo-600">
                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse" />Воспроизведение...
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
