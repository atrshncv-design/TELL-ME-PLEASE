import fs from "fs/promises"
import path from "path"
import { TaskRenderer } from "./TaskRenderer"
import { normalize } from "@/lib/normalize-task"
import type { TaskData } from "@/types/task"
import { sectorGradeKey, type EpochSector } from "@/lib/epoch"

interface EpochIndexJson {
  epoch: string
  title: string
  subtitle: string
  sectors: EpochSector[]
}

function validate(task: TaskData, stationId: string): boolean {
  const required = ["id", "title", "type", "category"] as const
  for (const field of required) {
    if (!task[field]) {
      console.error(`[EpochStationPage] Missing required field "${field}" in ${stationId}.json`)
      return false
    }
  }
  return true
}

/** Читаем index.json эпохи и находим сектор (для grade-ключа и «← Назад»). */
async function loadSector(slug: string, sectorId: string): Promise<EpochSector | null> {
  const indexPath = path.join(
    process.cwd(),
    "public",
    "content",
    "epochs",
    slug,
    "index.json"
  )
  try {
    const raw = await fs.readFile(indexPath, "utf-8")
    const index = JSON.parse(raw) as EpochIndexJson
    return index.sectors.find((s) => s.id === sectorId) ?? null
  } catch (err) {
    console.error("[EpochStationPage] Failed to load epoch index.json", err)
    return null
  }
}

async function loadStation(
  slug: string,
  sector: string,
  stationId: string
): Promise<TaskData | null> {
  const filePath = path.join(
    process.cwd(),
    "public",
    "content",
    "epochs",
    slug,
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
    console.error("[EpochStationPage] File not found:", filePath, err)
    return null
  }
}

/** Заглушка «Станция ещё строится» — 404-подобная страница, не крашить. */
function StationStub({ slug, sector }: { slug: string; sector: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-violet-100 via-sky-50 to-amber-50 px-4">
      <a
        href={`/epoch/${slug}/${sector}`}
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

export default async function EpochStationPage({
  params,
}: {
  params: Promise<{ slug: string; sector: string; stationId: string }>
}) {
  const { slug, sector, stationId } = await params

  const sectorMeta = await loadSector(slug, sector)
  const task = await loadStation(slug, sector, stationId)

  if (!task || !sectorMeta) {
    return <StationStub slug={slug} sector={sector} />
  }

  // grade-ключ сектора (A1→"5", A2→"6", B1→"8", B2→"9") — прогресс станции
  // пишется в tmp_progress_grade_<N> (читает lib/epoch.ts); «← Назад» — на
  // карту станций сектора.
  const grade = sectorGradeKey(sectorMeta)
  const backHref = `/epoch/${slug}/${sector}`

  return <TaskRenderer task={task} grade={grade} backHref={backHref} />
}
