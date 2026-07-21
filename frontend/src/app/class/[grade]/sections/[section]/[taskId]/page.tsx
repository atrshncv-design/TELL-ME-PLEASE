"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
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
  adverbs?: string[]
  time_phrases?: string[]
  base_verb?: string
  subject?: string
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

export default function TaskPage() {
  const { grade, section, taskId } = useParams<{ grade: string; section: string; taskId: string }>()
  const [task, setTask] = useState<TaskData | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const path = `/content/tasks/grade_${grade}/${taskId}.json`
    fetch(path)
      .then((r) => {
        if (!r.ok) throw new Error("Not found")
        return r.json()
      })
      .then(setTask)
      .catch(() => setError(`Задание "${taskId}" не найдено`))
  }, [grade, taskId])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-red-500 text-lg">{error}</p>
        <a href={`/class/${grade}/sections`} className="text-indigo-600 underline">Назад к разделам</a>
      </div>
    )
  }

  if (!task) {
    return <div className="flex items-center justify-center h-screen"><div className="text-indigo-600 animate-pulse">Загрузка...</div></div>
  }

  switch (task.type) {
    case "quiz":
      return <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50"><QuizTask title={task.title} description={task.description} items={task.items || []} /></div>
    case "drag-and-drop":
      return <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50"><DragAndDropTask title={task.title} description={task.description} columns={task.columns || []} items={task.items || []} /></div>
    case "fill-in":
      return <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50"><FillInTask title={task.title} description={task.description} items={task.items || []} /></div>
    case "ladder":
      return <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50"><LadderTask title={task.title} description={task.description} ladders={task.ladders || []} /></div>
    case "build-sentence":
      return <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50"><FillInTask title={task.title} description={task.description} items={task.items || []} /></div>
    case "role-play":
    case "voice-chat":
    case "fill-in-and-speak": {
      const taskContext = serializeContext(task)
      return <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50"><VoiceChatTask title={task.title} description={task.description} dialogue={task.dialogue} sections={task.sections} taskContext={taskContext} /></div>
    }
    default:
      return <div className="flex items-center justify-center h-screen"><p className="text-slate-500">Тип "{task.type}" пока не поддерживается</p></div>
  }
}
