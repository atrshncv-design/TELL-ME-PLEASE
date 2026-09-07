/** R104: метки сессии экзамена — какие упражнения открывали в текущей сессии.
 *  Хранилище скрыто за этим модулем (шов «хранилище меток сессии» — владеет
 *  Экзамен): sessionStorage, ключ tmp_exam_session_visited, значение — JSON-
 *  массив строк "<sectorId>/<stationId>" (id маршрутов /exam/<sector>/<station>).
 *  Время жизни: переживает перезагрузку в той же вкладке (sessionStorage),
 *  умирает при закрытии вкладки / новой вкладке; персистентный прогресс
 *  (tmp_progress_grade_exam, score > 0) не трогаем. SSR-safe: без window —
 *  пустой список, запись — no-op. */

export const EXAM_SESSION_VISITED_KEY = "tmp_exam_session_visited"

/** Ключ метки станции в сессии. */
export const examSessionKey = (sectorId: string, stationId: string): string =>
  `${sectorId}/${stationId}`

/** Прочитанные в текущей сессии метки (пусто вне браузера / при битой записи). */
export function readExamSessionVisited(): string[] {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return []
    const raw = window.sessionStorage.getItem(EXAM_SESSION_VISITED_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is string => typeof v === "string")
  } catch {
    return []
  }
}

/** Отметить станцию посещённой в текущей сессии (идемпотентно). */
export function markExamStationVisited(sectorId: string, stationId: string): string[] {
  const key = examSessionKey(sectorId, stationId)
  const visited = readExamSessionVisited()
  if (visited.includes(key)) return visited
  const next = [...visited, key]
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.setItem(EXAM_SESSION_VISITED_KEY, JSON.stringify(next))
    }
  } catch {
    /* ignore unavailable storage */
  }
  return next
}
