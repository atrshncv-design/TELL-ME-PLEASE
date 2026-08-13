"use client"

/**
 * TaskRenderer станций эпохи (тикет T04) — КОПИЯ паттерна классового
 * TaskRenderer (app/class/[grade]/sections/[section]/[taskId]/TaskRenderer.tsx),
 * НО:
 *  - backHref приходит пропом и ведёт на /epoch/<slug>/[sector]
 *    (классовый жёстко зашивает /class/{grade}/sections — для новой цепочки
 *    «Эпоха → Сектор → Станция» кнопка «← Назад» должна вести на сектор);
 *  - grade = grade-ключ сектора (A1→"5", A2→"6", B1→"8", B2→"9") — прогресс
 *    станций пишется стандартным saveTask в tmp_progress_grade_N, который
 *    читает lib/epoch.ts (sectorGradeKey).
 * Классовый TaskRenderer НЕ трогаем (это файлы T05/T06/T07 — matching/text-fix
 * уже зарегистрированы там; сюда зеркалим новые case при необходимости).
 */

import { useState } from "react"
import { QuizTask } from "@/components/tasks/QuizTask"
import { DragAndDropTask } from "@/components/tasks/DragAndDropTask"
import { FillInTask } from "@/components/tasks/FillInTask"
import { LadderTask } from "@/components/tasks/LadderTask"
import { VoiceChatTask } from "@/components/tasks/VoiceChatTask"
import { BuildSentenceTask } from "@/components/tasks/BuildSentenceTask"
import { ClozeTextTask } from "@/components/tasks/ClozeTextTask"
import { ClickMistakeTask } from "@/components/tasks/ClickMistakeTask"
import { FlashcardsTask } from "@/components/tasks/FlashcardsTask"
import { WheelTask } from "@/components/tasks/WheelTask"
import { ChooseStoryTask } from "@/components/tasks/ChooseStoryTask"
import { OneMinuteTask } from "@/components/tasks/OneMinuteTask"
import { BuildChatTask } from "@/components/tasks/BuildChatTask"
import { EscapeRoomTask } from "@/components/tasks/EscapeRoomTask"
import { SurvivalIslandTask } from "@/components/tasks/SurvivalIslandTask"
import { GrammarBattleTask, type GrammarBattleRound } from "@/components/tasks/GrammarBattleTask"
import { BossBattleTask } from "@/components/tasks/BossBattleTask"
import { MatchingTask } from "@/components/tasks/MatchingTask"
import { TextFixTask } from "@/components/tasks/TextFixTask"
import { TaskHeader } from "@/components/tasks/TaskHeader"
import { RulesPanel } from "@/components/RulesPanel"
import { useProgress } from "@/lib/useProgress"
import { useAnalytics } from "@/lib/useAnalytics"

interface TaskData {
  id: string
  title: string
  description: string
  type: string
  category: string
  items?: any[]
  columns?: any[]
  ladders?: any[]
  dialogue?: { speaker: string; text: string }[]
  sections?: { name: string; questions: string[] }[]
  adverbs?: string[]
  time_phrases?: string[]
  base_verb?: string
  subject?: string
  // Grammar Minecraft (тикет W3-T1): режим блоков-категорий + варианты времени.
  blocksMode?: boolean
  blocks?: { tense: string; label: string; blocks: { category: "subject" | "auxiliary" | "verb" | "object" | "time" | "place"; word: string }[] }[]
  // cloze (single-round)
  text?: string
  answers?: string[][]
  word_bank?: string[]
  hints?: string[]
  underline_words?: string[]
  // cloze (multi-round)
  rounds?: { text: string; answers: string[][]; word_bank: string[]; hints?: string[] }[]
  // flashcards
  cards?: { front: string; back: string }[]
  // voice-chat: системный промпт-роль из контента (тикет P6, «Спроси учителя»)
  task_context?: string
  // choose-story (тикет W1-T4): выбор героя/места/проблемы → рассказ по схеме
  scaffold?: "full" | "keywords"
  characters?: string[]
  places?: string[]
  problems?: string[]
  sentencePatterns?: string[]
  keywords?: string[]
  // one-minute (тикет W2-T1): One-Minute Challenge — тема, таймер, условия
  topic?: string
  duration?: number
  conditions?: { label: string; hint: string; markers: string[]; min?: number }[]
  // one-minute (правки 12.08): сценарий-текст — описание + предложения для чтения вслух
  script?: { description?: string; sentences?: string[] }
  // build-chat (тикет W2-T3): чат с пропусками + неожиданное событие
  chat?: any[]
  event?: any
  // survival-island (тикет W2-T2): категории-реплики «от лица команды»
  steps?: any[]
  // escape-room (тикет W2-T4): цепочка 5 станций Grammar Escape Room
  stations?: any[]
  // boss-battle (тикет W3-T3): цепочка 6 вызовов + финальный план поездки
  challenges?: any[]
  finalPlan?: any
  // matching (тикет T05, станция B1.2 «Анализ Профилей»): сопоставление
  // описаний с профессиями — «Угадай профессию».
  matching?: { items: { text: string; options: string[]; answer: string }[]; columns?: string[] }
  // text-fix (тикет T06, станция B2.4 «Стабилизация Реальности»): найди и
  // исправь ошибки в тексте — клик по ошибочному слову → варианты исправления.
  textFix?: {
    sentences: {
      sentence: string
      errors: { index: number; wrong: string; right: string; options?: string[] }[]
      hint?: string
    }[]
    instruction?: string
  }
  // voice-chat checklist (тикет T07, станции Речи): бот задаёт вопросы из
  // списка по одному, ответ оценивается по маркерам (эвристика one-minute).
  checklist?: { question: string; markers: string[]; min?: number; hint?: string }[]
  // drag-and-drop (W3-T03 client-fixes-0808): review: true — разбор ошибок
  // после «Проверить» (зелёные верные / красные ошибочные + «Далее»).
  review?: boolean
}

function serializeContext(task: TaskData): string {
  const parts: string[] = []
  // task_context (если есть) — главная инструкция роли: идёт первой,
  // до тем диалога (sections) и заголовка задания.
  if (task.task_context) {
    parts.push(task.task_context)
  }
  if (task.dialogue && task.dialogue.length > 0) {
    // Determine unique speakers
    const speakers = [...new Set(task.dialogue.map(d => d.speaker))]
    // AI plays the character (non-generic), student plays the interviewer
    const genericSpeakers = ["interviewer", "host", "teacher", "journalist"]
    const aiRole = speakers.find(s => !genericSpeakers.includes(s.toLowerCase())) || speakers[speakers.length - 1] || "character"
    const studentRole = speakers.find(s => genericSpeakers.includes(s.toLowerCase())) || speakers[0] || "interviewer"

    parts.push(`ROLE-PLAY SCENARIO.
You are playing the role of "${aiRole}" in this dialogue.
The student plays the role of "${studentRole}".
Stay in character at all times. Answer ONLY as ${aiRole}. Never speak for the student.
Follow the script structure but respond naturally as the character.`)

    task.dialogue.forEach((d) => {
      parts.push(`${d.speaker}: ${d.text}`)
    })
  }
  if (task.sections && task.sections.length > 0) {
    parts.push("CONVERSATION TOPICS. Guide the student through these topics:")
    task.sections.forEach((s) => {
      parts.push(`${s.name}: ${s.questions.join(" | ")}`)
    })
  }
  if (task.title) {
    parts.push(`TASK: ${task.title}. ${task.description}`)
  }
  return parts.join("\n")
}

const BG = "min-h-screen bg-gradient-to-br from-violet-100 via-sky-50 to-amber-50"

export function TaskRenderer({
  task,
  grade,
  backHref,
}: {
  task: TaskData
  grade: string
  backHref: string
}) {
  const { saveTask } = useProgress(grade)
  const { track } = useAnalytics()
  // Тикет P6: панель-шпаргалка «Правила» (открывается кнопкой на voice-заданиях)
  const [rulesOpen, setRulesOpen] = useState(false)
  // onComplete was previously dead — never passed by TaskRenderer. Now wired
  // to the useProgress hook (no backend, decision Q8) so per-task score/total
  // is persisted to localStorage and surfaced as badges on the section cards.
  // Also fires the task_completed analytics event (closes the funnel).
  const onScored = (score: number, total: number) => {
    // W1-T1: передаём task.type — saveTask классифицирует валюту награды
    // (🗣 для SPEAKING_TASK_TYPES, иначе ⚡). Choose-story → 🗣.
    saveTask(task.id, score, total, task.type)
    track({ event_type: "task_completed", grade: Number(grade), task_id: task.id, score })
  }

  switch (task.type) {
    case "quiz":
      return <div className={BG}><TaskHeader title={task.title} backHref={backHref} /><QuizTask title={task.title} description={task.description} items={task.items || []} onComplete={onScored} /></div>
    case "drag-and-drop":
      return <div className={BG}><TaskHeader title={task.title} backHref={backHref} /><DragAndDropTask title={task.title} description={task.description} columns={task.columns || []} items={task.items || []} review={task.review} onComplete={onScored} /></div>
    case "fill-in":
      return <div className={BG}><TaskHeader title={task.title} backHref={backHref} /><FillInTask title={task.title} description={task.description} items={task.items || []} onComplete={onScored} /></div>
    case "build-sentence":
      return <div className={BG}><TaskHeader title={task.title} backHref={backHref} /><BuildSentenceTask title={task.title} description={task.description} adverbs={task.adverbs || []} timePhrases={task.time_phrases || []} baseVerb={task.base_verb || ""} subject={task.subject || "I"} blocksMode={task.blocksMode} blocks={task.blocks || []} onComplete={onScored} /></div>
    case "cloze":
      return <div className={BG}><TaskHeader title={task.title} backHref={backHref} /><ClozeTextTask title={task.title} description={task.description} text={task.text} answers={task.answers} wordBank={task.word_bank} hints={task.hints} underlineWords={task.underline_words} rounds={(task.rounds || []).map((r) => ({ text: r.text, answers: r.answers, wordBank: r.word_bank, hints: r.hints }))} onComplete={onScored} /></div>
    case "click-mistake":
      return <div className={BG}><TaskHeader title={task.title} backHref={backHref} /><ClickMistakeTask title={task.title} description={task.description} items={task.items || []} onComplete={onScored} /></div>
    case "flashcards":
      return <div className={BG}><TaskHeader title={task.title} backHref={backHref} /><FlashcardsTask title={task.title} description={task.description} cards={task.cards || []} onComplete={onScored} /></div>
    case "wheel":
      return <div className={BG}><TaskHeader title={task.title} backHref={backHref} /><WheelTask title={task.title} description={task.description} items={task.items || []} /></div>
    case "ladder":
      return <div className={BG}><TaskHeader title={task.title} backHref={backHref} /><LadderTask title={task.title} description={task.description} ladders={task.ladders || []} onComplete={onScored} /></div>
    case "choose-story":
      return <div className={BG}><TaskHeader title={task.title} backHref={backHref} /><ChooseStoryTask title={task.title} description={task.description} scaffold={task.scaffold || "full"} characters={task.characters || []} places={task.places || []} problems={task.problems || []} sentencePatterns={task.sentencePatterns || []} keywords={task.keywords || []} onComplete={onScored} /></div>
    case "one-minute":
      return <div className={BG}><TaskHeader title={task.title} backHref={backHref} /><OneMinuteTask title={task.title} description={task.description} topic={task.topic || ""} duration={task.duration} conditions={task.conditions || []} script={task.script} onComplete={onScored} /></div>
    case "build-chat":
      return <div className={BG}><TaskHeader title={task.title} backHref={backHref} /><BuildChatTask title={task.title} description={task.description} chat={task.chat || []} event={task.event} onComplete={onScored} /></div>
    case "survival-island":
      return <div className={BG}><TaskHeader title={task.title} backHref={backHref} /><SurvivalIslandTask title={task.title} description={task.description} scaffold={(task.scaffold as "full" | "keywords" | "conditions") || "full"} steps={task.steps || []} conditions={task.conditions} onComplete={onScored} /></div>
    case "escape-room":
      return <div className={BG}><TaskHeader title={task.title} backHref={backHref} /><EscapeRoomTask title={task.title} description={task.description} stations={task.stations || []} onComplete={onScored} /></div>
    case "grammar-battle":
      // W3-T2 Grammar Battle: 3 раунда сборки предложений на время (⚡).
      // task.rounds в локальном интерфейсе описан формой cloze — приводим
      // на СВОЕЙ строке рендера (аддитивно-безопасный паттерн, чужие ветки
      // не трогаем). Контракт раунда: {stimulus, mode, words[], answer, timeSec?}.
      return <div className={BG}><TaskHeader title={task.title} backHref={backHref} /><GrammarBattleTask title={task.title} description={task.description} rounds={(task.rounds ?? []) as unknown as GrammarBattleRound[]} onComplete={onScored} /></div>
    case "boss-battle":
      // W3-T3 Boss Battle: цепочка 6 вызовов + финальный план поездки (🗣).
      return <div className={BG}><TaskHeader title={task.title} backHref={backHref} /><BossBattleTask title={task.title} description={task.description} challenges={task.challenges || []} finalPlan={task.finalPlan} onComplete={onScored} /></div>
    case "matching":
      // T05 Matching: сопоставление описаний с профессиями («Угадай профессию»,
      // станция B1.2). Валюта ⚡ — тип НЕ в SPEAKING_TASK_TYPES.
      return <div className={BG}><TaskHeader title={task.title} backHref={backHref} /><MatchingTask title={task.title} description={task.description} items={task.matching?.items || []} columns={task.matching?.columns} onComplete={onScored} /></div>
    case "text-fix":
      // T06 TextFix: найди и исправь ошибки в тексте (станция B2.4
      // «Стабилизация Реальности»). Валюта ⚡ — тип НЕ в SPEAKING_TASK_TYPES.
      return <div className={BG}><TaskHeader title={task.title} backHref={backHref} /><TextFixTask title={task.title} description={task.description} data={task.textFix || { sentences: [] }} onComplete={onScored} /></div>
    case "role-play":
    case "voice-chat":
    case "fill-in-and-speak":
      return (
        <div className={BG}>
          <div className="relative mx-auto max-w-lg">
            {/* Кнопка «Правила» (тикет P6): плавающая, над voice-экраном.
                Не съедает высоту (VoiceChatTask = h-[100dvh]) и не перекрывает
                шапку — позиция top-16 ниже строки заголовка.
                G7 (клиентские правки 08.08.2026): у voice-chat кнопки НЕТ —
                только role-play / fill-in-and-speak. */}
            {task.type !== "voice-chat" && (
              <button
                onClick={() => setRulesOpen(true)}
                className="absolute right-3 top-16 z-20 flex items-center gap-1 rounded-full border border-indigo-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50"
              >
                📖 Правила
              </button>
            )}
            <VoiceChatTask title={task.title} description={task.description} dialogue={task.dialogue} sections={task.sections} taskContext={serializeContext(task)} grade={grade} taskId={task.id} checklist={task.checklist} backHref={backHref} onComplete={onScored} />
          </div>
          <RulesPanel open={rulesOpen} onClose={() => setRulesOpen(false)} />
        </div>
      )
    default:
      return <div className="flex items-center justify-center h-screen"><p className="text-slate-500">Тип "{task.type}" пока не поддерживается</p></div>
  }
}
