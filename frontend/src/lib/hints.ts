/**
 * Умная обратная связь (тикет W1-T3 «подсказки вместо Wrong»).
 *
 * Единый источник дружелюбных подсказок для неверных ответов:
 *   hintFor(task, item, answer) → строка-подсказка.
 *
 * Приоритет:
 *   1. wrongExplanation / explanation / hint из JSON задания (если есть);
 *   2. фолбэк по типу задания: quiz/fill-in → «Проверь форму глагола!»,
 *      click-mistake → «Посмотри на подлежащее и время!» (+ эвристика по
 *      разнице ошибочного слова и контекста предложения);
 *   3. общая фраза «Попробуй ещё раз! Ты почти у цели!».
 *
 * Тон — дружелюбный, детский, UI на русском.
 */

/** Минимальный «вопрос/предложение», из которого достаём подсказки. */
export interface HintItem {
  wrongExplanation?: unknown
  explanation?: unknown
  hint?: unknown
  wrong?: string | null
  text?: string
}

/** Задание: строка-тип ("quiz", "fill-in", "click-mistake", ...) или объект с полем type. */
export type HintTask = string | { type?: string }

/** Фолбэк-фразы по типу задания. */
const PHRASES = {
  quiz: "Проверь форму глагола!",
  "fill-in": "Проверь форму глагола!",
  "click-mistake": "Посмотри на подлежащее и время!",
  default: "Попробуй ещё раз! Ты почти у цели!",
} as const

/** Дополнительные подбадривающие фразы (для разнообразия / будущих экранов). */
export const ENCOURAGING_PHRASES: readonly string[] = [
  "Проверь форму глагола!",
  "Посмотри на подлежащее и время!",
  "Попробуй ещё раз! Ты почти у цели!",
  "Не сдавайся — у тебя получится! 💪",
  "Внимательно посмотри на предложение ещё раз!",
]

/** Первая непустая строка из значений (защита от нестроковых полей JSON). */
function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

/**
 * Эвристика для click-mistake: правило по разнице ошибочного слова и контекста.
 * В контенте нет поля corrected — выводим правило из самого wrong-слова.
 */
function clickMistakeHint(item: HintItem): string {
  const wrong = typeof item.wrong === "string" ? item.wrong : null
  if (!wrong) {
    // Ловушка (wrong: null) — ошибки нет, мягко зовём перепроверить.
    return "Перепроверь каждое слово — вдруг тут всё верно? 😉"
  }
  const lower = (typeof item.text === "string" ? item.text : "").toLowerCase()
  const w = wrong.toLowerCase()

  // -ing без вспомогательного am/is/are → «He playing football now.»
  if (w.endsWith("ing") && !/\b(am|is|are)\b/.test(lower)) {
    return "Похоже, перед словом на -ing нужен помощник am / is / are!"
  }
  // am/is/are есть, но глагол без -ing → «I am play tennis every day.»
  if (/\b(am|is|are)\b/.test(lower) && !/ing\b/.test(lower)) {
    return "После am / is / are глаголу нужно окончание -ing!"
  }
  // -s/-es при подлежащем I/you/we/they → «We watches TV every evening.»
  if (/(s|es)$/.test(w) && /\b(i|you|we|they)\b/.test(lower)) {
    return "С «I», «you», «we» и «they» окончание -s не нужно!"
  }
  return PHRASES["click-mistake"]
}

/**
 * Подсказка для неверного ответа.
 *
 * @param task   тип задания ("quiz" | "fill-in" | "click-mistake" | ...) или
 *               объект задания с полем type.
 * @param item   текущий вопрос/предложение из items[].
 * @param answer ответ ученика (зарезервирован для будущих точечных подсказок).
 */
export function hintFor(task: HintTask, item?: HintItem, answer?: unknown): string {
  const type = typeof task === "string" ? task : (task?.type ?? "")
  // 1. Подсказка из JSON задания (если есть).
  const fromJson = firstString(item?.wrongExplanation, item?.explanation, item?.hint)
  if (fromJson) return fromJson
  // 2. Эвристика/фолбэк по типу задания.
  if (type === "click-mistake") return clickMistakeHint(item ?? {})
  return PHRASES[type as keyof typeof PHRASES] ?? PHRASES.default
}
