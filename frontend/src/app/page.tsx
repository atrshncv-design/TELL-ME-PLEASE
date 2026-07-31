"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import AdminLoginModal from "@/components/AdminLoginModal"

export default function Home() {
  const router = useRouter()
  const [adminOpen, setAdminOpen] = useState(false)

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4">
      {/* Decorative color blobs (Bright Kids Palette, DESIGN.md). */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-speaking-200/50 blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-listening-200/50 blur-2xl" />
      <div className="pointer-events-none absolute bottom-1/4 left-1/4 h-32 w-32 rounded-full bg-vocabulary-200/40 blur-2xl" />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative flex flex-col items-center gap-6 text-center"
      >
        <div className="text-6xl drop-shadow-lg">🎓</div>
        <h1 className="text-4xl font-bold text-primary-900">Tell Me Please</h1>
        <p className="max-w-md text-lg text-slate-600">
          Интерактивная платформа для изучения английского языка
        </p>
        <button
          onClick={() => router.push("/class")}
          className="mt-4 rounded-2xl bg-gradient-to-r from-primary-500 to-violet-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary-300/70 transition-all hover:from-primary-600 hover:to-violet-600 hover:shadow-xl hover:shadow-primary-300/80 active:scale-95"
        >
          Начать →
        </button>
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
