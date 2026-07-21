import fs from "fs/promises"
import path from "path"
import { notFound } from "next/navigation"
import { TaskRenderer } from "./TaskRenderer"

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

async function loadTask(grade: string, taskId: string): Promise<TaskData | null> {
  const filePath = path.join(process.cwd(), "public", "content", "tasks", `grade_${grade}`, `${taskId}.json`)
  try {
    const raw = await fs.readFile(filePath, "utf-8")
    return JSON.parse(raw)
  } catch (err) {
    console.error("[TaskPage] File not found:", filePath, err)
    return null
  }
}

export default async function TaskPage({ params }: { params: Promise<{ grade: string; section: string; taskId: string }> }) {
  const { grade, taskId } = await params
  const task = await loadTask(grade, taskId)

  if (!task) {
    notFound()
  }

  return <TaskRenderer task={task} grade={grade} />
}
