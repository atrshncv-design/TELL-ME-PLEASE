"use client"

import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"

const sections = [
  { id: "vocab", title: "Словарный запас", icon: "📚", desc: "Новые слова и выражения" },
  { id: "grammar", title: "Грамматика", icon: "✏️", desc: "Правила и упражнения" },
  { id: "listen", title: "Аудирование", icon: "🎧", desc: "Понимание на слух" },
  { id: "speak", title: "Свободное общение", icon: "🗣️", desc: "Диалог с AI-аватаром" },
]

export default function SectionsPage() {
  const { grade } = useParams<{ grade: string }>()
  const router = useRouter()

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <h1 className="text-3xl font-bold text-indigo-900 mb-2">
        {grade} класс
      </h1>
      <p className="text-slate-500 mb-8">Выбери раздел</p>
      <div className="flex flex-col gap-3 max-w-md w-full">
        {sections.map((s, i) => (
          <motion.button
            key={s.id}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => router.push(`/chat?grade=${grade}&section=${s.id}`)}
            className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-md transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] border border-indigo-100 text-left"
          >
            <span className="text-3xl">{s.icon}</span>
            <div>
              <div className="font-bold text-indigo-800">{s.title}</div>
              <div className="text-sm text-slate-500">{s.desc}</div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
