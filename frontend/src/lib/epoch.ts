/** T03 «Карта секторов эпохи» — чистые функции (без React), чтобы ad-hoc
 *  скрипт мог проверить разблокировку и проценты без рендера компонентов.
 *  Прогресс станций эпохи пишется СТАНДАРТНЫМ saveTask (useProgress) в
 *  tmp_progress_grade_N по grade сектора (A1→5, A2→6, B1→8, B2→9) — читаем
 *  оттуда же, useProgress не меняем. */

/** Ключ localStorage прогресса станций эпохи (зарезервирован тикетом;
 *  фактические записи станций — в tmp_progress_grade_N по grade сектора). */
export const epochProgressKey = "tmp_epoch_present_simple_progress"

/** Станция сектора (из index.json эпохи). */
export interface EpochStation {
  id: string
  file: string
  title: string
  /** Тип механики станции (quiz/voice-chat/matching/text-fix/…) — для
   *  достижений (T12): маппинг station.id → тип строится из index.json. */
  type: string
}

/** Сектор эпохи (из index.json эпохи). */
export interface EpochSector {
  id: string
  level: string
  grade: number | string
  title: string
  story: string
  stations: EpochStation[]
}

/** Запись прогресса станции (формат useProgress TaskProgress). */
export interface StationProgress {
  score: number
  total: number
  ts: string
  speaking?: boolean
}

/** Прогресс эпохи: ключ класса (N из tmp_progress_grade_N) → станция → запись.
 *  Станции разных секторов живут в РАЗНЫХ ключах класса (station-1 в a1 и
 *  station-1 в a2 не коллизируют), поэтому карта двухуровневая. */
export type EpochProgress = Record<string, Record<string, StationProgress>>

/** N из grade сектора — ключ tmp_progress_grade_<N> (A1→5, A2 «6-7»→6,
 *  B1→8, B2 «9 и ОГЭ»→9): первое число из строки grade. */
export const sectorGradeKey = (sector: EpochSector): string => {
  const m = String(sector.grade).match(/\d+/)
  return m ? m[0] : String(sector.grade)
}

/** Пройдена ли станция: в прогрессе сектора есть запись с score > 0. */
export function stationPassed(
  progress: EpochProgress,
  sector: EpochSector,
  station: EpochStation
): boolean {
  const entries = progress[sectorGradeKey(sector)]
  if (!entries) return false
  const entry = entries[station.id]
  return Boolean(entry && entry.score > 0)
}

/** Сколько станций сектора пройдено (score > 0). */
export function sectorStationsDone(progress: EpochProgress, sector: EpochSector): number {
  return sector.stations.filter((st) => stationPassed(progress, sector, st)).length
}

/** Открыт ли сектор (Q9): первый всегда открыт; остальные — когда ВСЕ станции
 *  предыдущего сектора имеют score > 0 в прогрессе. */
export function sectorUnlocked(
  progress: EpochProgress,
  sectors: EpochSector[],
  sectorIndex: number
): boolean {
  if (sectorIndex <= 0) return true
  const prev = sectors[sectorIndex - 1]
  if (!prev) return true
  return prev.stations.every((st) => stationPassed(progress, prev, st))
}

/** % пройденных станций сектора (0..100; станций нет → 0). */
export function sectorPercent(progress: EpochProgress, sector: EpochSector): number {
  if (sector.stations.length === 0) return 0
  return Math.min(
    100,
    Math.round((sectorStationsDone(progress, sector) / sector.stations.length) * 100)
  )
}

/** Всего станций в эпохе. */
export function epochStationsTotal(sectors: EpochSector[]): number {
  return sectors.reduce((sum, s) => sum + s.stations.length, 0)
}

/** Сколько станций эпохи пройдено (score > 0). */
export function epochStationsDone(progress: EpochProgress, sectors: EpochSector[]): number {
  return sectors.reduce((sum, s) => sum + sectorStationsDone(progress, s), 0)
}

/** % по всей эпохе (все сектора; для «Портал восстановлен на X%»). 0..100,
 *  потолок 100, станций нет → 0. */
export function epochPercent(progress: EpochProgress, sectors: EpochSector[]): number {
  const total = epochStationsTotal(sectors)
  if (total <= 0) return 0
  return Math.min(100, Math.round((epochStationsDone(progress, sectors) / total) * 100))
}

/** Сколько станций эпохи пройдено (score > 0) в секторах ОДНОГО grade-ключа
 *  (A1→"5", A2→"6", B1→"8", B2→"9") — для достижений (T12) и активного
 *  класса на карте секторов. */
export function epochStationsDoneForGrade(
  progress: EpochProgress,
  sectors: EpochSector[],
  gradeKey: string
): number {
  return sectors
    .filter((s) => sectorGradeKey(s) === gradeKey)
    .reduce((sum, s) => sum + sectorStationsDone(progress, s), 0)
}

/** Маппинг station.id → тип станции для секторов с данным grade-ключом
 *  (T12 «Достижения»). Прогресс станций лежит в tmp_progress_grade_N по grade
 *  сектора, поэтому типы станций подбираются по grade: station-1 в a1 (quiz)
 *  и station-1 в a2 (click-mistake) не смешиваются. */
export function epochTypeById(
  sectors: EpochSector[],
  gradeKey: string
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const s of sectors) {
    if (sectorGradeKey(s) !== gradeKey) continue
    for (const st of s.stations) {
      if (st.type) out[st.id] = st.type
    }
  }
  return out
}

/** Ключ localStorage: показывался ли финал «Портал открыт!» для эпохи.
 *  Формат из тикета T12: tmp_portal_epoch_present_simple_opened (id эпохи
 *  с дефисом → подчёркивание: "present-simple" → "present_simple"). */
export const epochPortalOpenedKey = (epoch: string) =>
  `tmp_portal_epoch_${epoch.replace(/-/g, "_")}_opened`
