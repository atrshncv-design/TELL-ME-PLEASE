"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

export default function Home() {
  const router = useRouter()

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
    </div>
  )
}
