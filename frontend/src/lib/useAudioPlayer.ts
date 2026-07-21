"use client"

import { useCallback, useRef, useState } from "react"

export function useAudioPlayer({
  onPlaybackStart,
  onPlaybackEnd,
}: {
  onPlaybackStart: () => void
  onPlaybackEnd: () => void
}) {
  const [playing, setPlaying] = useState(false)
  const queueRef = useRef<string[]>([])
  const playingRef = useRef(false)

  const playNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      playingRef.current = false
      setPlaying(false)
      onPlaybackEnd()
      return
    }

    playingRef.current = true
    setPlaying(true)
    onPlaybackStart()

    const b64 = queueRef.current.shift()!
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const blob = new Blob([bytes], { type: "audio/mpeg" })
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)

    audio.onended = () => {
      URL.revokeObjectURL(url)
      playNext()
    }

    audio.onerror = () => {
      URL.revokeObjectURL(url)
      playNext()
    }

    audio.play().catch(() => playNext())
  }, [onPlaybackStart, onPlaybackEnd])

  const enqueue = useCallback(
    (base64: string) => {
      queueRef.current.push(base64)
      if (!playingRef.current) {
        playNext()
      }
    },
    [playNext]
  )

  return { playing, enqueue }
}
