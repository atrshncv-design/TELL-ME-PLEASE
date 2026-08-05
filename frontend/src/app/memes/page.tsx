"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { MEMES, type Meme } from "@/lib/memes"

/**
 * Карточка-мем: setup жирным, punchline раскрывается по клику (W3-T5).
 */
function MemeCard({ meme }: { meme: Meme }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      className="rounded-2xl border-2 border-primary-200 bg-white p-4 text-left shadow-soft transition-colors hover:bg-primary-50"
    >
      <p className="font-bold text-primary-900">{meme.setup}</p>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <p className="pt-2 text-slate-600">{meme.punchline}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

export default function MemesPage() {
  const router = useRouter()

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col gap-5 px-4 py-4">
      {/* Шапка: ← Назад (на лендинг) + заголовок */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="Назад на главную"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl bg-primary-100 px-3 py-2 text-base font-bold text-primary-700 transition-colors hover:bg-primary-200"
        >
          ← Назад
        </button>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-primary-900">
          Мемы
        </h1>
      </div>

      {/* Сетка карточек-шуток (mobile-first: одна колонка) */}
      <div className="grid grid-cols-1 gap-3">
        {MEMES.map((meme) => (
          <MemeCard key={meme.id} meme={meme} />
        ))}
      </div>
    </div>
  )
}
