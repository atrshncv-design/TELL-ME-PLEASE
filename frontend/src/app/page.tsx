"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import AdminLoginModal from "@/components/AdminLoginModal"

/**
 * «Что тебя ждёт» (клиентские правки 08.08.2026, G3) — 5 опций клиентки:
 * Инструктаж, Миссии, Общение, Квесты, Уровни сложности. Чипы-подписи
 * (не кнопки): главный CTA — «Начать играть →».
 */
const WHATS_AHEAD: { name: string; emoji: string; chip: string }[] = [
  { name: "Инструктаж", emoji: "🎓", chip: "bg-grammar-100 text-grammar-800 border-grammar-200" },
  { name: "Миссии", emoji: "🚀", chip: "bg-primary-100 text-primary-800 border-primary-200" },
  { name: "Общение", emoji: "💬", chip: "bg-speaking-100 text-speaking-800 border-speaking-200" },
  { name: "Квесты", emoji: "🧩", chip: "bg-vocabulary-100 text-vocabulary-800 border-vocabulary-200" },
  { name: "Уровни сложности", emoji: "📈", chip: "bg-tobe-100 text-tobe-800 border-tobe-200" },
]

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
}

const item = {
  hidden: { y: 16, opacity: 0, scale: 0.92 },
  visible: { y: 0, opacity: 1, scale: 1 },
}

export default function Home() {
  const router = useRouter()
  const [adminOpen, setAdminOpen] = useState(false)

  return (
    <div className="relative flex min-h-[100dvh] flex-1 flex-col items-center justify-center overflow-hidden px-4 py-12">
      {/* Decorative color blobs (Bright Kids Palette, DESIGN.md). */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-speaking-200/50 blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-listening-200/50 blur-2xl" />
      <div className="pointer-events-none absolute bottom-1/4 left-1/4 h-32 w-32 rounded-full bg-vocabulary-200/40 blur-2xl" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex w-full max-w-md flex-col items-center gap-5 text-center"
      >
        {/* Verb Bot hero — floating mascot with a speech bubble. */}
        <motion.div variants={item} className="relative mt-2 flex flex-col items-center">
          <motion.div
            className="mb-2 rounded-2xl rounded-br-md border border-primary-100 bg-white px-3 py-1.5 text-sm font-semibold text-primary-800 shadow-soft"
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 18 }}
          >
            Hi! I&apos;m a Verb Bot! 🤖
          </motion.div>
          <motion.img
            src="/mascot/happy.jpg"
            alt="Verb Bot — маскот платформы"
            className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-pop"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        <motion.h1
          variants={item}
          className="font-display-alt text-5xl font-black leading-[1.05] tracking-tight text-primary-900 text-balance"
        >
          Time travel mission
        </motion.h1>

        <motion.p variants={item} className="max-w-sm text-lg font-medium text-slate-600">
          Учи английский — играя!
        </motion.p>

        <motion.button
          variants={item}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.03 }}
          onClick={() => router.push("/mission")}
          className="mt-2 min-h-[56px] rounded-2xl bg-primary-600 px-10 py-4 text-lg font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
        >
          Начать играть →
        </motion.button>

        {/* «Что тебя ждёт» — 5 опций клиентки (G3): Инструктаж, Миссии,
            Общение, Квесты, Уровни сложности. */}
        <motion.div variants={item} className="mt-4 flex flex-col items-center gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            Что тебя ждёт
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {WHATS_AHEAD.map((w) => (
              <span
                key={w.name}
                className={`flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold shadow-soft ${w.chip}`}
              >
                <span aria-hidden="true">{w.emoji}</span>
                {w.name}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Мемы — лёгкий раздел со смешными грамматическими карточками (W3-T5). */}
        <motion.div variants={item} className="mt-1">
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => router.push("/memes")}
            className="flex min-h-[44px] items-center gap-2 rounded-full border-2 border-primary-200 bg-white px-5 py-2 text-sm font-bold text-primary-700 shadow-soft transition-colors hover:bg-primary-100"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
            Мемы
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Незаметная кнопка входа в админ-панель (T05, решение 14 SPEC).
          Левый нижний угол — правый занят Verb Bot'ом. Мелкая, серая,
          почти прозрачная: дети её не замечают, учительница знает, где она. */}
      <button
        type="button"
        onClick={() => setAdminOpen(true)}
        aria-label="Админка"
        className="absolute bottom-3 left-3 z-40 rounded-full p-2 text-slate-400 opacity-25 transition-opacity hover:opacity-100 focus:opacity-100"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      <AdminLoginModal open={adminOpen} onClose={() => setAdminOpen(false)} />
    </div>
  )
}
