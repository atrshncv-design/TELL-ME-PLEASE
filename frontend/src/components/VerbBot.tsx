"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { pluralTasks } from "@/lib/portal"

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

/**
 * W1-T01 «Verb Bot — карточка-бейдж»: цвет индикатора эмоции на бейдже.
 * happy/cheer → зелёный, think → жёлтый, sad → красный, неизвестный → голубой.
 */
const MOOD_DOT: Record<BotMood, string> = {
  happy: "bg-green-500",
  think: "bg-amber-400",
  sad: "bg-red-500",
  cheer: "bg-green-500",
}

/**
 * W1-T2 «Сюжет портала»: реплики бота при росте прогресса (после завершения
 * задания). Русские, как приветствия миров на карте. {N} подставляется
 * динамически (сколько заданий осталось до 100%).
 */
const PORTAL_PHRASES = [
  "Портал оживает!",
  "Отличная работа! Продолжай!",
  "Портал заряжается — так держать!",
  "Энергия портала растёт!",
]
const PORTAL_COUNTDOWN = (n: number) =>
  `Ещё ${n} ${pluralTasks(n)} — и откроется следующий мир!`
/** Когда прогресс дошёл до 100% — бот празднует вместе с оверлеем. */
const PORTAL_DONE_PHRASES = [
  "Портал открыт! Вперёд, путешественник! 🎉",
  "Ты восстановил портал — это было здорово!",
  "Портал полностью открыт! Ты — легенда!",
]

/** Событие от карты миров (sections/page.tsx) с числами прогресса. */
interface PortalProgressDetail {
  completedCount: number
  totalTasks: number
}

interface VerbBotContextValue {
  say: (event: BotEventType) => void
  /** T12 «Геймификация эпохи»: произвольная реплика-брифинг (текст + настроение,
   *  таймер скрытия как у say). Добавлен аддитивно — существующие страницы
   *  используют только say(). */
  speakText: (text: string, mood?: BotMood, duration?: number) => void
}

const VerbBotContext = createContext<VerbBotContextValue>({
  say: () => {},
  speakText: () => {},
})

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

  // Показ реплики с таймером скрытия (общий для say и сюжета портала).
  const speak = useCallback((text: string, mood: BotMood, duration = 3000) => {
    setPhrase(text)
    setMood(mood)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setPhrase(null), duration)
  }, [])

  const say = useCallback(
    (event: BotEventType) => {
      const options =
        event === "correct"
          ? grade !== null && grade >= 8
            ? PRAISE_SENIOR
            : PRAISE_JUNIOR
          : PHRASES[event]
      const text = options[Math.floor(Math.random() * options.length)]
      speak(text, MOOD_FOR[event])
    },
    [grade, speak],
  )

  // T12: брифинги секторов/эпохи — произвольный текст через тот же speak
  // (таймер скрытия переиспользуется, настроение по умолчанию happy).
  const speakText = useCallback(
    (text: string, mood: BotMood = "happy", duration = 4000) =>
      speak(text, mood, duration),
    [speak],
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

  // ── W1-T2 «Сюжет портала» ─────────────────────────────────────────────
  // Карта миров шлёт window-событие verb-bot:portal-progress при каждом
  // изменении completedCount/totalTasks. Бот сравнивает с последним
  // значением и комментирует РОСТ (после завершения задания). API
  // useVerbBot() при этом не меняется.
  const portalLastRef = useRef<{ grade: string | null; count: number } | null>(null)
  const gradeKey = grade === null ? null : String(grade)

  // Базовая линия: эффекты дочерней страницы (dispatch события) выполняются
  // РАНЬШЕ эффектов провайдера, поэтому первый dispatch при загрузке
  // приложения прямо на карте миров слушатель может пропустить. Базу читаем
  // сами из localStorage при каждой смене маршрута/класса — без реплики.
  useEffect(() => {
    if (grade === null) return
    let count = 0
    try {
      const raw = localStorage.getItem(`tmp_progress_grade_${grade}`)
      if (raw) count = Object.keys(JSON.parse(raw) as Record<string, unknown>).length
    } catch {
      /* ignore malformed / unavailable storage */
    }
    portalLastRef.current = { grade: gradeKey, count }
  }, [grade, gradeKey, pathname])

  useEffect(() => {
    const onPortalProgress = (e: Event) => {
      const detail = (e as CustomEvent<PortalProgressDetail>).detail
      if (!detail || detail.totalTasks <= 0) return
      const last = portalLastRef.current
      if (last === null || last.grade !== gradeKey) {
        // Первый заход на карту или смена класса — только базовая линия.
        portalLastRef.current = { grade: gradeKey, count: detail.completedCount }
        return
      }
      if (detail.completedCount <= last.count) return
      portalLastRef.current = { grade: gradeKey, count: detail.completedCount }
      // Рост прогресса — бот комментирует (mood cheer, чуть дольше таймер).
      const done = detail.completedCount >= detail.totalTasks
      const remaining = detail.totalTasks - detail.completedCount
      const options = done
        ? PORTAL_DONE_PHRASES
        : [...PORTAL_PHRASES, PORTAL_COUNTDOWN(remaining)]
      speak(options[Math.floor(Math.random() * options.length)], "cheer", 3500)
    }
    window.addEventListener("verb-bot:portal-progress", onPortalProgress)
    return () => window.removeEventListener("verb-bot:portal-progress", onPortalProgress)
  }, [gradeKey, speak])

  return (
    <VerbBotContext.Provider value={{ say, speakText }}>
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
  // W1-T01: фото битое/недоступное → скрыть и показать 🤖 (fallback сохранён).
  const [imgFailed, setImgFailed] = useState(false)
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
      {/* W1-T01 «Verb Bot — карточка-бейдж»: фото с ореолом акцента (ring-2
          ring-primary-300), подпись «Verb Bot» + цветной индикатор эмоции
          (точка по mood). Покачивание y [0,-4,0] и fallback 🤖 сохранены;
          пузырь речи и позиционирование флоата не менялись. */}
      <div className="flex w-[90px] flex-col items-center">
        {imgFailed ? (
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white bg-white text-2xl shadow-lg ring-2 ring-primary-300"
            role="img"
            aria-label="Verb Bot"
          >
            🤖
          </div>
        ) : (
          <motion.img
            src={`/mascot/${mood}.jpg`}
            alt="Verb Bot"
            className="h-16 w-16 rounded-full border-2 border-white bg-white object-cover shadow-lg ring-2 ring-primary-300"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            onError={() => setImgFailed(true)}
          />
        )}
        <div className="mt-0.5 inline-flex items-center gap-1">
          <span
            className={`h-2 w-2 animate-pulse rounded-full ${MOOD_DOT[mood] ?? "bg-sky-400"}`}
            aria-hidden="true"
          />
          <span className="whitespace-nowrap text-[10px] font-bold text-primary-900">
            Verb Bot
          </span>
        </div>
      </div>
    </div>
  )
}
