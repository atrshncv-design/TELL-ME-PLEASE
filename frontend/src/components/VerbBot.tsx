"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

/**
 * Verb Bot — floating mascot (decision Q7/Q15b).
 * Shows in the bottom-right corner on ALL screens. Speaks short phrases
 * in a speech bubble on events (task start, correct, wrong, finish, greeting).
 * One photo for all emotions now (decision Q8); 4 files in /mascot/ ready for
 * the client's per-emotion photos later (just replace the files).
 */

type BotMood = "happy" | "think" | "cheer" | "sad"
type BotEventType = "greet" | "start" | "correct" | "wrong" | "finish"

/**
 * Praise phrases from the client (2026-07-30), split by grade band:
 * junior = 5-7 классы, senior = 8-9 классы (more "grown-up" tone).
 */
const PRAISE_JUNIOR = [
  "Well done!", "Great job!", "Excellent work!", "Amazing!", "Perfect!",
  "You did it!", "That's right!", "Very good!", "Fantastic!", "Superb!",
  "Brilliant!", "Awesome!", "You're doing great!", "Keep it up!",
  "Good thinking!", "You're on the right track!", "Nice work!",
  "You're improving!", "That's correct!", "You're almost there!",
  "You're a star!", "You're a genius!", "You're a hero!",
  "You're a champion!", "You're a winner!", "You're a rock star!",
  "You're a superstar!", "You're a wizard!", "You're a master!",
  "You're a legend!",
]

const PRAISE_SENIOR = [
  "You're making progress!", "You're getting better!", "You're on fire!",
  "You're unstoppable!", "You're incredible!", "You're outstanding!",
  "You're remarkable!", "You're exceptional!", "You're terrific!",
  "You're wonderful!", "You're a quick learner!", "You're a fast thinker!",
  "You're a smart cookie!", "You're a sharp mind!", "You're a clever one!",
  "You're a bright spark!", "You're a clever student!",
  "You're a great worker!", "You're a hard worker!",
  "You're a dedicated learner!",
]

const PHRASES: Record<Exclude<BotEventType, "correct">, string[]> = {
  greet: ["Hi! I'm a Verb Bot! 🤖", "Welcome! Let's learn verbs!"],
  start: ["Let's go! 🚀", "Scan the verb! 🔍", "Ready? Let's do it!"],
  wrong: ["Try again! 💪", "Almost! Keep going!", "Not quite — check the form!"],
  finish: ["Ready for the next level? 🏆", "Awesome work! 🌟", "You're a verb hero! 🦸"],
}

const MOOD_FOR: Record<BotEventType, BotMood> = {
  greet: "happy",
  start: "think",
  correct: "cheer",
  wrong: "sad",
  finish: "cheer",
}

interface VerbBotContextValue {
  say: (event: BotEventType) => void
}

const VerbBotContext = createContext<VerbBotContextValue>({ say: () => {} })

export function useVerbBot() {
  return useContext(VerbBotContext)
}

export function VerbBotProvider({ children }: { children: React.ReactNode }) {
  const [phrase, setPhrase] = useState<string | null>(null)
  const [mood, setMood] = useState<BotMood>("happy")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const greetedRef = useRef(false)

  // Grade from the URL (/class/N/...) — picks the praise list for the band.
  const pathname = usePathname()
  const gradeMatch = pathname.match(/\/class\/(\d+)/)
  const grade = gradeMatch ? Number(gradeMatch[1]) : null

  // Task page = /class/<grade>/sections/<section>/<taskId> (two segments after
  // sections — the world map .../sections alone must NOT match).
  // On task pages the bot sits bottom-center so it never covers answer buttons;
  // everywhere else it stays in the bottom-right corner.
  const isTaskPage = /\/class\/\d+\/sections\/[^/]+\/[^/]+/.test(pathname)

  const say = useCallback(
    (event: BotEventType) => {
      const options =
        event === "correct"
          ? grade !== null && grade >= 8
            ? PRAISE_SENIOR
            : PRAISE_JUNIOR
          : PHRASES[event]
      const text = options[Math.floor(Math.random() * options.length)]
      setPhrase(text)
      setMood(MOOD_FOR[event])
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setPhrase(null), 3000)
    },
    [grade],
  )

  // Greet once on mount (after first user interaction so it feels responsive)
  useEffect(() => {
    if (greetedRef.current) return
    const greet = () => {
      if (greetedRef.current) return
      greetedRef.current = true
      say("greet")
      window.removeEventListener("pointerdown", greet)
    }
    window.addEventListener("pointerdown", greet, { once: true })
    // Also greet after a short delay even without interaction (non-blocking)
    const t = setTimeout(() => {
      if (!greetedRef.current) {
        greetedRef.current = true
        say("greet")
      }
    }, 1500)
    return () => {
      clearTimeout(t)
      window.removeEventListener("pointerdown", greet)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [say])

  return (
    <VerbBotContext.Provider value={{ say }}>
      {children}
      <VerbBotFloating
        phrase={phrase}
        mood={mood}
        position={isTaskPage ? "bottom-center" : "bottom-right"}
      />
    </VerbBotContext.Provider>
  )
}

function VerbBotFloating({
  phrase,
  mood,
  position,
}: {
  phrase: string | null
  mood: BotMood
  position: "bottom-right" | "bottom-center"
}) {
  const containerClass =
    position === "bottom-center"
      ? "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none"
      : "fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none"
  return (
    <div className={containerClass}>
      <AnimatePresence>
        {phrase && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="max-w-[200px] bg-white rounded-2xl rounded-br-md px-3 py-2 text-sm font-medium text-slate-700 shadow-lg border border-primary-100"
          >
            {phrase}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.img
        src={`/mascot/${mood}.jpg`}
        alt="Verb Bot"
        className="w-16 h-16 rounded-full object-cover shadow-lg border-2 border-white bg-white"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        onError={(e) => {
          // Fallback if image missing — hide broken image, show emoji
          ;(e.target as HTMLImageElement).style.display = "none"
        }}
      />
    </div>
  )
}
