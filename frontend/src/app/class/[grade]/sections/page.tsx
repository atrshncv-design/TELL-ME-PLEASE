"use client"

import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"

interface SectionDef {
  id: string
  title: string
  icon: string
  desc: string
  tasks: { id: string; title: string }[]
}

const sections: SectionDef[] = [
  {
    id: "grammar",
    title: "Грамматика",
    icon: "✏️",
    desc: "Окончания, вопросы, наречия",
    tasks: [
      { id: "grammar_endings_sort", title: "Сортировка окончаний" },
      { id: "grammar_endings_quiz", title: "Окончания: викторина" },
      { id: "grammar_v1_vs_quiz", title: "V1 / Vs" },
      { id: "grammar_roulette", title: "Рулетка" },
      { id: "grammar_joke_quiz", title: "Шутка: V1/Vs" },
      { id: "grammar_negation", title: "Отрицание" },
      { id: "grammar_yes_no_questions", title: "Do / Does" },
      { id: "grammar_wh_questions", title: "Специальные вопросы" },
      { id: "grammar_ladder", title: "Лесенка" },
      { id: "grammar_verb_forms_quiz", title: "Викторина: глаголы" },
      { id: "grammar_adverbs_build", title: "Наречия: построй" },
      { id: "grammar_adverbs_place", title: "Наречия: вставь" },
    ],
  },
  {
    id: "vocab",
    title: "Словарный запас",
    icon: "📚",
    desc: "Лексика и тексты",
    tasks: [
      { id: "story_harry_potter_routine", title: "Распорядок дня Гарри Поттера" },
    ],
  },
  {
    id: "listen",
    title: "Аудирование",
    icon: "🎧",
    desc: "Прослушивание и role-play",
    tasks: [
      { id: "story_harry_potter_interview", title: "Интервью с Гарри Поттером" },
    ],
  },
  {
    id: "speak",
    title: "Свободное общение",
    icon: "🗣️",
    desc: "Голосовые задания с AI",
    tasks: [
      { id: "speaking_about_yourself", title: "Расскажи о себе" },
      { id: "speaking_peer_conversation", title: "Поговори со сверстником" },
    ],
  },
]

export default function SectionsPage() {
  const { grade } = useParams<{ grade: string }>()
  const router = useRouter()

  return (
    <div className="flex flex-col items-center px-4 py-12 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-indigo-900 mb-2">{grade} класс</h1>
      <p className="text-slate-500 mb-8">Выбери раздел</p>

      {sections.map((s, si) => (
        <div key={s.id} className="w-full mb-6">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: si * 0.1 }}
            className="flex items-center gap-3 mb-3"
          >
            <span className="text-2xl">{s.icon}</span>
            <div>
              <div className="font-bold text-indigo-800">{s.title}</div>
              <div className="text-xs text-slate-500">{s.desc}</div>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 gap-2 ml-10">
            {s.tasks.map((t, ti) => (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: si * 0.1 + ti * 0.05 }}
                onClick={() => router.push(`/class/${grade}/sections/${s.id}/${t.id}`)}
                className="text-left px-3 py-2 rounded-xl bg-white border border-indigo-100 text-sm text-slate-700 hover:border-indigo-300 hover:shadow-md transition-all"
              >
                {t.title}
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
