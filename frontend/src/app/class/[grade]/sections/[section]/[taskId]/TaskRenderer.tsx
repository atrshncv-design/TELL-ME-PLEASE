"use client"

import { QuizTask } from "@/components/tasks/QuizTask"
import { DragAndDropTask } from "@/components/tasks/DragAndDropTask"
import { FillInTask } from "@/components/tasks/FillInTask"
import { LadderTask } from "@/components/tasks/LadderTask"
import { VoiceChatTask } from "@/components/tasks/VoiceChatTask"

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
}

function serializeContext(task: TaskData): string {
  const parts: string[] = []
  if (task.dialogue && task.dialogue.length > 0) {
    parts.push("ROLE-PLAY SCENARIO. You are playing a role in this dialogue. Follow the script structure but respond naturally as the character.")
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

const BG = "min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50"

export function TaskRenderer({ task, grade }: { task: TaskData; grade: string }) {
  switch (task.type) {
    case "quiz":
      return <div className={BG}><QuizTask title={task.title} description={task.description} items={task.items || []} /></div>
    case "drag-and-drop":
      return <div className={BG}><DragAndDropTask title={task.title} description={task.description} columns={task.columns || []} items={task.items || []} /></div>
    case "fill-in":
    case "build-sentence":
      return <div className={BG}><FillInTask title={task.title} description={task.description} items={task.items || []} /></div>
    case "ladder":
      return <div className={BG}><LadderTask title={task.title} description={task.description} ladders={task.ladders || []} /></div>
    case "role-play":
    case "voice-chat":
    case "fill-in-and-speak":
      return <div className={BG}><VoiceChatTask title={task.title} description={task.description} dialogue={task.dialogue} sections={task.sections} taskContext={serializeContext(task)} /></div>
    default:
      return <div className="flex items-center justify-center h-screen"><p className="text-slate-500">Тип "{task.type}" пока не поддерживается</p></div>
  }
}
