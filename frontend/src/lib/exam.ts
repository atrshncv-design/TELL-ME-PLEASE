/** T14 «Великий Экзамен Времен» — чистые функции (без React), чтобы ad-hoc
 *  скрипт мог проверить прогресс и финальную сцену без рендера компонентов.
 *  Прогресс станций экзамена пишется СТАНДАРТНЫМ saveTask (useProgress) в
 *  tmp_progress_grade_exam (grade = "exam" для всех станций — экзамен не
 *  привязан к классу). Ключи станций = внутренние id JSON (exam_s1_station_1
 *  … exam_s4_station_6). */

/** grade-ключ прогресса экзамена: tmp_progress_grade_exam. */
export const EXAM_PROGRESS_GRADE = "exam"

/** Флаг «ВЫ ВЛАДЕЕТЕ ВРЕМЕНЕМ!» показан (1 раз). */
export const EXAM_COMPLETED_KEY = "tmp_exam_completed"

/** Внутренний id задания последней станции (Финал, sector-4 station-6). */
export const EXAM_LAST_TASK_ID = "exam_s4_station_6"

/** Станция сектора (из index.json экзамена). */
export interface ExamStation {
  id: string
  file: string
  title: string
  /** Тип механики станции (quiz/voice-chat/matching/cloze/…). */
  type?: string
}

/** Сектор экзамена (из index.json экзамена). */
export interface ExamSector {
  id: string
  title: string
  story?: string
  icon?: string
  stations: ExamStation[]
}

/** Запись прогресса станции (формат useProgress TaskProgress). */
export interface StationProgress {
  score: number
  total: number
  ts: string
  speaking?: boolean
}

/** Прогресс экзамена: taskId (exam_s1_station_1 …) → запись. Один ключ на
 *  весь экзамен (в отличие от эпох с двумя уровнями по классам). */
export type ExamProgress = Record<string, StationProgress>

/** Внутренний id задания станции по позиции в index.json: сектор sector-N
 *  (0-based si), станция station-M (0-based sti) → exam_s<si+1>_station_<sti+1>. */
export const examStationTaskId = (sectorIdx: number, stationIdx: number): string =>
  `exam_s${sectorIdx + 1}_station_${stationIdx + 1}`

/** Всего станций экзамена (по index.json). */
export function examStationsTotal(sectors: ExamSector[]): number {
  return sectors.reduce((n, s) => n + s.stations.length, 0)
}

/** Пройдена ли станция: в прогрессе экзамена есть запись с score > 0. */
export function examStationPassed(
  progress: ExamProgress,
  sectorIdx: number,
  stationIdx: number
): boolean {
  const entry = progress[examStationTaskId(sectorIdx, stationIdx)]
  return Boolean(entry && entry.score > 0)
}

/** Сколько станций сектора пройдено (score > 0). */
export function examSectorStationsDone(
  progress: ExamProgress,
  sectorIdx: number,
  sector: ExamSector
): number {
  return sector.stations.filter((_, i) => examStationPassed(progress, sectorIdx, i)).length
}

/** Сколько всего станций экзамена пройдено. */
export function examStationsDone(progress: ExamProgress, sectors: ExamSector[]): number {
  let n = 0
  for (let si = 0; si < sectors.length; si++) {
    n += examSectorStationsDone(progress, si, sectors[si])
  }
  return n
}

/** % прохождения экзамена: 0..100 (total ≤ 0 → 0, потолок 100). */
export function examPercent(progress: ExamProgress, sectors: ExamSector[]): number {
  const total = examStationsTotal(sectors)
  if (total <= 0) return 0
  return Math.min(100, Math.round((examStationsDone(progress, sectors) / total) * 100))
}

/** Пройдена ли ПОСЛЕДНЯЯ станция (exam_s4_station_6) — триггер финала
 *  «ВЫ ВЛАДЕЕТЕ ВРЕМЕНЕМ!». */
export function examLastStationPassed(progress: ExamProgress): boolean {
  const entry = progress[EXAM_LAST_TASK_ID]
  return Boolean(entry && entry.score > 0)
}
