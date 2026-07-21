"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export function useAudioPlayer({
  onPlaybackStart,
  onPlaybackEnd,
}: {
  onPlaybackStart: () => void
  onPlaybackEnd: () => void
}) {
  const [playing, setPlaying] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const queueRef = useRef<ArrayBuffer[]>([])
  const playingRef = useRef(false)
  const scheduledUntilRef = useRef(0)
  const onStartRef = useRef(onPlaybackStart)
  const onEndRef = useRef(onPlaybackEnd)
  onStartRef.current = onPlaybackStart
  onEndRef.current = onPlaybackEnd

  useEffect(() => {
    return () => {
      ctxRef.current?.close()
      ctxRef.current = null
    }
  }, [])

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new AudioContext()
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume()
    }
    return ctxRef.current
  }, [])

  const scheduleNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      playingRef.current = false
      setPlaying(false)
      onEndRef.current()
      return
    }

    playingRef.current = true
    setPlaying(true)
    onStartRef.current()

    const ctx = getCtx()
    const buf = queueRef.current.shift()!
    const startAt = Math.max(ctx.currentTime, scheduledUntilRef.current)

    ctx.decodeAudioData(buf).then((decoded) => {
      const source = ctx.createBufferSource()
      source.buffer = decoded
      source.connect(ctx.destination)
      source.start(startAt)
      scheduledUntilRef.current = startAt + decoded.duration
      source.onended = () => scheduleNext()
    }).catch(() => scheduleNext())
  }, [getCtx])

  const enqueue = useCallback(
    (base64: string) => {
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      queueRef.current.push(bytes.buffer)
      if (!playingRef.current) {
        scheduleNext()
      }
    },
    [scheduleNext]
  )

  return { playing, enqueue }
}
