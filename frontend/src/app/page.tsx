"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

export default function Home() {
  const router = useRouter()

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6 text-center"
      >
        <div className="text-6xl">🎓</div>
        <h1 className="text-4xl font-bold text-indigo-900">Tell Me Please</h1>
        <p className="text-lg text-slate-600 max-w-md">
          Интерактивная платформа для изучения английского языка
        </p>
        <button
          onClick={() => router.push("/class")}
          className="mt-4 rounded-2xl bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-xl active:scale-95"
        >
          Начать →
        </button>
      </motion.div>
    </div>
  )
}
