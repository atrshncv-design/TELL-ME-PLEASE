/** W3-T4 «Достижения» — чистые функции (стиль lib/portal.ts), SSR-safe:
 *  localStorage читает/пишет только вызывающий (страница карты миров),
 *  поэтому ad-hoc скрипт может проверить разблокировки без рендера React.
 *
 *  Механика (спека 6, «Достижения»): одиночные достижения, localStorage-ключ
 *  tmp_achievements_grade_5 → [{id, unlockedAt}]. Эвристики простые — счётчики
 *  выполненных заданий по ТИПАМ: маппинг taskId → тип строится из index.json
 *  на карте миров (в progress-мапе типов нет — только score/total/ts/speaking).
 */

/** Запись разблокированного достижения (формат localStorage). */
export interface UnlockedAchievement {
  id: string
  unlockedAt: string
}

/** Минимальный вид записи прогресса. Структурно совместим с ProgressMap из
 *  useProgress.ts (TaskProgress), но без импорта React-хука — модуль остаётся
 *  чистым и проверяемым через `node --experimental-strip-types`. */
export interface AchievementProgressEntry {
  score: number
  total: number
  ts?: string
  speaking?: boolean
}
export type AchievementProgressMap = Record<string, AchievementProgressEntry>

/** Описание достижения: id + русская подпись + условие (title-подпись). */
export interface AchievementDef {
  id: string
  title: string
  description: string
  emoji: string
}

/** Канонический список достижений (спека 6) — порядок = порядок показа. */
export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "question-master",
    title: "Question Master",
    description: "Задай 5 вопросов",
    emoji: "❓",
  },
  {
    id: "past-tense-hero",
    title: "Past Tense Hero",
    description: "Пройди 3 задания с Past",
    emoji: "🦸",
  },
  {
    id: "speaking-streak",
    title: "Speaking Streak",
    description: "3 голосовых задания подряд",
    emoji: "🎤",
  },
]

/** Ключ localStorage: tmp_achievements_grade_5 (формат из тикета W3-T4). */
export const achievementsKey = (grade: string) => `tmp_achievements_grade_${grade}`

/** Типы заданий, где ученик «задаёт вопросы» (станции make-question / question). */
const QUESTION_TASK_TYPES: readonly string[] = [
  "escape-room", // станция make-question
  "boss-battle", // раунды с вопросами
  "grammar-battle", // дуэль на вопросах
  "quiz", // вопросы с вариантами
]

/** Эвристика «задания с Past»: детектив-цепочка (W1-T5) — это тот же тип
 *  click-mistake (поля fixOptions/explanations/questions), плюс escape-room. */
const PAST_TENSE_TASK_TYPES: readonly string[] = ["click-mistake", "escape-room"]

/** Прочитать разблокированные достижения из localStorage (SSR-safe: [] вне
 *  браузера / при битом JSON). */
export function getAchievements(grade: string): UnlockedAchievement[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(achievementsKey(grade))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Сколько пройденных заданий относится к одному из типов (пересечение
 *  ключей progress с маппингом taskId → тип). */
function countCompletedByType(
  progress: AchievementProgressMap,
  typeById: Record<string, string>,
  types: readonly string[]
): number {
  let n = 0
  for (const taskId of Object.keys(progress)) {
    const t = typeById[taskId]
    if (t && types.includes(t)) n += 1
  }
  return n
}

/** «3 голосовых задания подряд»: самые свежие выполненные задания (по ts) —
 *  все голосовые (флаг speaking проставляет saveTask по SPEAKING_TASK_TYPES).
 *  Записи без ts трактуются как самые старые и серию не обрывают. */
function speakingStreakCount(progress: AchievementProgressMap): number {
  const byTsDesc = Object.values(progress).sort((a, b) =>
    (b.ts || "").localeCompare(a.ts || "")
  )
  let streak = 0
  for (const e of byTsDesc) {
    if (e.speaking === true) streak += 1
    else break
  }
  return streak
}

/** Новые разблокированные достижения (которых ещё нет в alreadyUnlocked).
 *  Чистая функция: вызывается при каждом изменении progress на карте миров
 *  (после завершения задания → возврат на карту) и, после батча boss-battle,
 *  может вызываться прямо из onScored в TaskRenderer (там progress-мапа уже
 *  под рукой; typeById можно построить из index.json). */
export function checkAchievements(
  progress: AchievementProgressMap,
  typeById: Record<string, string>,
  alreadyUnlocked: UnlockedAchievement[]
): UnlockedAchievement[] {
  const unlockedIds = new Set(alreadyUnlocked.map((u) => u.id))
  const now = new Date().toISOString()

  const questions = countCompletedByType(progress, typeById, QUESTION_TASK_TYPES)
  const past = countCompletedByType(progress, typeById, PAST_TENSE_TASK_TYPES)
  const streak = speakingStreakCount(progress)

  const qualifies: Record<string, boolean> = {
    "question-master": questions >= 5,
    "past-tense-hero": past >= 3,
    "speaking-streak": streak >= 3,
  }

  const fresh: UnlockedAchievement[] = []
  for (const a of ACHIEVEMENTS) {
    if (qualifies[a.id] && !unlockedIds.has(a.id)) {
      fresh.push({ id: a.id, unlockedAt: now })
    }
  }
  return fresh
}
