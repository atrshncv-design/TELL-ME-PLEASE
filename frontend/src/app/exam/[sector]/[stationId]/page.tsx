import fs from "fs/promises"
import path from "path"
import { TaskRenderer } from "./TaskRenderer"
import { normalize } from "@/lib/normalize-task"
import type { TaskData } from "@/types/task"
import { EXAM_PROGRESS_GRADE } from "@/lib/exam"

function validate(task: TaskData, stationId: string): boolean {
  const required = ["id", "title", "type", "category"] as const
  for (const field of required) {
    if (!task[field]) {
      console.error(`[ExamStationPage] Missing required field "${field}" in ${stationId}.json`)
      return false
    }
  }
  return true
}

async function loadStation(
  sector: string,
  stationId: string
): Promise<TaskData | null> {
  const filePath = path.join(
    process.cwd(),
    "public",
    "content",
    "exam",
    sector,
    `${stationId}.json`
  )
  try {
    const raw = await fs.readFile(filePath, "utf-8")
    const task = normalize(JSON.parse(raw)) as TaskData
    if (!validate(task, stationId)) {
      return null
    }
    return task
  } catch (err) {
    console.error("[ExamStationPage] File not found:", filePath, err)
    return null
  }
}

/** Заглушка «Станция ещё строится» — 404-подобная страница, не крашить. */
function StationStub({ sector }: { sector: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-violet-100 via-sky-50 to-amber-50 px-4">
      <a
        href="/exam"
        className="mb-6 flex min-h-[44px] min-w-[44px] items-center justify-center self-start rounded-2xl bg-primary-100 px-3 py-2 text-base font-bold text-primary-700 transition-colors hover:bg-primary-200"
      >
        ← Назад
      </a>
      <p className="mb-2 text-6xl" aria-hidden="true">
        🚧
      </p>
      <h1 className="font-display mb-2 text-center text-2xl font-extrabold tracking-tight text-primary-900">
        Станция ещё строится
      </h1>
      <p className="max-w-sm text-center text-sm text-slate-500">
        Задание появится здесь совсем скоро. Загляни позже!
      </p>
    </div>
  )
}

/**
 * T14: страница станции финального экзамена /exam/<sector>/<stationId>.
 * Читает JSON станции из content/exam/<sector>/<stationId>.json, рендерит
 * ЛОКАЛЬНЫЙ TaskRenderer (копия эпохального, backHref пропом). grade = "exam" —
 * прогресс всех станций экзамена пишется в tmp_progress_grade_exam (lib/exam.ts).
 */
export default async function ExamStationPage({
  params,
}: {
  params: Promise<{ sector: string; stationId: string }>
}) {
  const { sector, stationId } = await params

  const task = await loadStation(sector, stationId)

  if (!task) {
    return <StationStub sector={sector} />
  }

  return <TaskRenderer task={task} grade={EXAM_PROGRESS_GRADE} backHref="/exam" />
}
