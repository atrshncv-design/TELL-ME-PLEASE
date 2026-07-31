/**
 * Промпт-роутер: маппинг branch_id (класс) и task_id на системный промпт.
 * Перенос 1:1 из backend/app/services/prompt_router.py.
 *
 * Правило CLAUDE.md:12 — НЕ динамическая генерация промптов: только чтение
 * из prompts_config.json + статический маппинг ролей.
 */
import config from "./prompts_config.json"

const _FALLBACK = "grade_7"

// Маппинг task_id с фронта на роль-промпты (как _TASK_ROLE_MAP в Python).
const _TASK_ROLE_MAP: Record<string, string> = {
  story_harry_potter_interview: "harry_potter_interview",
  speaking_peer_conversation: "peer_conversation",
  speaking_about_yourself: "about_yourself",
}

/**
 * Резолв системного промпта.
 *
 * Порядок (1:1 из prompt_router.py):
 *   1. Если task_id задан — сначала точный ключ task_id в prompts_config.json
 *      (например "harry_potter_interview"), потом маппинг через _TASK_ROLE_MAP
 *      (например "story_harry_potter_interview" -> "harry_potter_interview").
 *   2. Иначе — grade_N по branch_id, затем grade_7 как fallback.
 */
export function resolvePrompt(branchId: string, taskId?: string): string {
  if (taskId) {
    // Сначала пробуем точный ключ task_id (например "harry_potter_interview")
    if (taskId in config) {
      return config[taskId as keyof typeof config]
    }
    // Потом маппинг известных task_id на роль-ключи
    const roleKey = _TASK_ROLE_MAP[taskId]
    if (roleKey && roleKey in config) {
      return config[roleKey as keyof typeof config]
    }
  }
  const key = /^\d+$/.test(branchId) ? `grade_${branchId}` : branchId
  return config[key as keyof typeof config] ?? config[_FALLBACK]
}
