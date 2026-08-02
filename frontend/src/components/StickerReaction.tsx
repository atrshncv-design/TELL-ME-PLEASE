import type { ReactNode } from "react"
import { motion } from "framer-motion"

/**
 * StickerReaction (design-boost, тикет 05) — свои SVG-стикеры-реакции Verb Bot.
 * Копирайт-чисто (рисуем сами, стиль monoline stroke 2, как WorldIcon/TaskIcon).
 * Правило реш. 7: ≤1–2 стикера на экран — рендерить точечно, не везде.
 */
export type StickerId = "fire" | "mindblown" | "laugh" | "heart-eyes" | "oops"

const PATHS: Record<StickerId, ReactNode> = {
  // 🔥-стиль «Ты машина!» — пламя
  fire: (
    <>
      <path d="M12 3c.5 3-1.5 4.5-2.5 6C8 11 8 13 9.5 14.5c-.8-1.5-.3-3 .5-4 .8 1 .5 2.5 1.5 3.5.5-2 .8-3.5 2.5-5 1.5 1.5 2.5 3 2.5 5.5 0 1-.5 2-1.5 2.5.5-1.5-.5-3-1.5-4-.5 2-1 3-2.5 4.5" />
      <path d="M12 21c3 0 5-2 5-5 0-1.5-1-3-2-4 .5 2-.5 3.5-2 4.5-.8-1.3-.5-2.5.5-3.5-.5 1-1 1.5-1 3 0 1 .5 2 .5 2" />
    </>
  ),
  // 🤯-стиль «Не останавливайся!» — взрыв/звезда
  mindblown: (
    <>
      <path d="M12 3l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L6.2 7.2l4-.6z" />
      <circle cx="12" cy="16.5" r="3.5" />
    </>
  ),
  // 😄-стиль «Красавчик!» — широкая улыбка
  laugh: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14.5c1.2 1.4 2.6 2 4 2s2.8-.6 4-2" />
      <path d="M9 9.5h.01M15 9.5h.01" />
    </>
  ),
  // 😍-стиль «Вау!» — сердечки-глаза
  "heart-eyes": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 11.5c-.8 0-1.5.7-1.5 1.5 0 1 1.5 2.3 1.5 2.3s1.5-1.3 1.5-2.3c0-.8-.7-1.5-1.5-1.5z" />
      <path d="M15.5 11.5c-.8 0-1.5.7-1.5 1.5 0 1 1.5 2.3 1.5 2.3s1.5-1.3 1.5-2.3c0-.8-.7-1.5-1.5-1.5z" />
      <path d="M9 17c1 .6 5 .6 6 0" />
    </>
  ),
  // 😅-стиль «Ой! Почти…» — капля пота
  oops: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5c.9.8 1.9 1.2 3 1.2s2.1-.4 3-1.2" />
      <path d="M9 9.5h.01M15 9.5h.01" />
      <path d="M17.5 3.5c-.6 1.2-.2 2 .5 2.6.7-.6 1.1-1.4.5-2.6-.2.5-.6.8-1 .8-.4 0-.7-.3-1-.8z" fill="currentColor" stroke="none" />
    </>
  ),
}

const SPRING = { type: "spring", stiffness: 400, damping: 15 } as const

/**
 * Появляется с пружиной, через ~1.2с улетает вверх и тает.
 * Классический «стикер-реакция» поверх интерфейса.
 */
export function StickerReaction({
  id,
  className,
  text,
}: {
  id: StickerId
  className?: string
  text?: string
}) {
  return (
    <motion.div
      initial={{ scale: 0, y: 0, opacity: 0 }}
      animate={{ scale: 1, y: -28, opacity: [0, 1, 1, 0] }}
      transition={{ ...SPRING, times: [0, 0.15, 0.8, 1], duration: 1.3 }}
      className={`pointer-events-none absolute z-30 flex flex-col items-center ${className ?? ""}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-10 w-10 drop-shadow-md"
      >
        {PATHS[id]}
      </svg>
      {text && <span className="mt-0.5 text-xs font-black text-slate-600">{text}</span>}
    </motion.div>
  )
}
