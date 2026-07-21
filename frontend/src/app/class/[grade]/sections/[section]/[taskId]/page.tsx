"use client"

import { useParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
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
  dialogue?: any[]
  sections?: any[]
  question_words?: string[]
  auxiliary?: string[]
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
        <a href={`/class/${grade}/sections`} className="text-indigo-600 underline">
          Назад к разделам
        </a>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-indigo-600 animate-pulse">Загрузка...</div>
      </div>
    )
  }

  const renderTask = () => {
    switch (task.type) {
      case "quiz":
        return <QuizTask title={task.title} description={task.description} items={task.items || []} />
      case "drag-and-drop":
        return (
          <DragAndDropTask
            title={task.title}
            description={task.description}
            columns={task.columns || []}
            items={task.items || []}
          />
        )
      case "fill-in":
        return <FillInTask title={task.title} description={task.description} items={task.items || []} />
      case "ladder":
        return <LadderTask title={task.title} description={task.description} ladders={task.ladders || []} />
      case "role-play":
      case "voice-chat":
      case "fill-in-and-speak":
        return (
          <VoiceChatTask
            title={task.title}
            description={task.description}
            dialogue={task.dialogue}
            sections={task.sections}
          />
        )
      case "build-sentence":
        return <FillInTask title={task.title} description={task.description} items={task.items || []} />
      default:
        return (
          <div className="p-6 text-center">
            <p className="text-slate-500">Тип задания "{task.type}" пока не поддерживается</p>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {renderTask()}
    </div>
  )
}
