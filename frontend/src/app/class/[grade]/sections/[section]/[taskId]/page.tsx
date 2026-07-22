import fs from "fs/promises"
import path from "path"
import { notFound } from "next/navigation"
import { TaskRenderer } from "./TaskRenderer"
import { normalize } from "@/lib/normalize-task"
import type { TaskData } from "@/types/task"

function validate(task: TaskData, taskId: string): boolean {
  const required = ["id", "title", "type", "category"] as const
  for (const field of required) {
    if (!task[field]) {
      console.error(`[TaskPage] Missing required field "${field}" in ${taskId}.json`)
      return false
    }
  }
  return true
}

async function loadTask(grade: string, taskId: string): Promise<TaskData | null> {
  const filePath = path.join(process.cwd(), "public", "content", "tasks", `grade_${grade}`, `${taskId}.json`)
  try {
    const raw = await fs.readFile(filePath, "utf-8")
    const task = normalize(JSON.parse(raw)) as TaskData
    if (!validate(task, taskId)) {
      return null
    }
    return task
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
