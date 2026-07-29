"use client"

import { QuizTask } from "@/components/tasks/QuizTask"
import { DragAndDropTask } from "@/components/tasks/DragAndDropTask"
import { FillInTask } from "@/components/tasks/FillInTask"
import { LadderTask } from "@/components/tasks/LadderTask"
import { VoiceChatTask } from "@/components/tasks/VoiceChatTask"
import { BuildSentenceTask } from "@/components/tasks/BuildSentenceTask"
import { ClozeTextTask } from "@/components/tasks/ClozeTextTask"
import { TaskHeader } from "@/components/tasks/TaskHeader"
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
  // cloze (single-round)
  text?: string
  answers?: string[][]
  word_bank?: string[]
  hints?: string[]
  underline_words?: string[]
  // cloze (multi-round)
  rounds?: { text: string; answers: string[][]; word_bank: string[]; hints?: string[] }[]
}

function serializeContext(task: TaskData): string {
  const parts: string[] = []
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

export function TaskRenderer({ task, grade }: { task: TaskData; grade: string }) {
  const backHref = `/class/${grade}/sections`
  const { saveTask } = useProgress(grade)
  const { track } = useAnalytics()
  // onComplete was previously dead — never passed by TaskRenderer. Now wired
  // to the useProgress hook (no backend, decision Q8) so per-task score/total
  // is persisted to localStorage and surfaced as badges on the section cards.
  // Also fires the task_completed analytics event (closes the funnel).
  const onScored = (score: number, total: number) => {
    saveTask(task.id, score, total)
    track({ event_type: "task_completed", grade: Number(grade), task_id: task.id, score })
  }

  switch (task.type) {
    case "quiz":
      return <div className={BG}><TaskHeader title={task.title} backHref={backHref} /><QuizTask title={task.title} description={task.description} items={task.items || []} onComplete={onScored} /></div>
    case "drag-and-drop":
      return <div className={BG}><TaskHeader title={task.title} backHref={backHref} /><DragAndDropTask title={task.title} description={task.description} columns={task.columns || []} items={task.items || []} onComplete={onScored} /></div>
    case "fill-in":
      return <div className={BG}><TaskHeader title={task.title} backHref={backHref} /><FillInTask title={task.title} description={task.description} items={task.items || []} onComplete={onScored} /></div>
    case "build-sentence":
      return <div className={BG}><TaskHeader title={task.title} backHref={backHref} /><BuildSentenceTask title={task.title} description={task.description} adverbs={task.adverbs || []} timePhrases={task.time_phrases || []} baseVerb={task.base_verb || ""} subject={task.subject || "I"} onComplete={onScored} /></div>
    case "cloze":
      return <div className={BG}><TaskHeader title={task.title} backHref={backHref} /><ClozeTextTask title={task.title} description={task.description} text={task.text} answers={task.answers} wordBank={task.word_bank} hints={task.hints} underlineWords={task.underline_words} rounds={(task.rounds || []).map((r) => ({ text: r.text, answers: r.answers, wordBank: r.word_bank, hints: r.hints }))} onComplete={onScored} /></div>
    case "ladder":
      return <div className={BG}><TaskHeader title={task.title} backHref={backHref} /><LadderTask title={task.title} description={task.description} ladders={task.ladders || []} /></div>
    case "role-play":
    case "voice-chat":
    case "fill-in-and-speak":
      return <div className={BG}><VoiceChatTask title={task.title} description={task.description} dialogue={task.dialogue} sections={task.sections} taskContext={serializeContext(task)} grade={grade} /></div>
    default:
      return <div className="flex items-center justify-center h-screen"><p className="text-slate-500">Тип "{task.type}" пока не поддерживается</p></div>
  }
}
