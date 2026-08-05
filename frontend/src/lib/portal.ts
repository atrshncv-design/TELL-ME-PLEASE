/** W1-T2 «Сюжет портала» — чистые функции (без React), чтобы ad-hoc скрипт
 *  мог проверить расчёт % и финальную сцену без рендера компонентов.
 *  Прогресс портала = completedCount / total заданий класса × 100. */

/** % восстановления портала: 0..100 (total ≤ 0 → 0, потолок 100). */
export function portalPercent(completedCount: number, totalTasks: number): number {
  if (totalTasks <= 0) return 0
  return Math.min(100, Math.round((completedCount / totalTasks) * 100))
}

/** Русское склонение «задание / задания / заданий» для N. */
export function pluralTasks(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return "задание"
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "задания"
  return "заданий"
}

/** Ключ localStorage: показывался ли финал «Портал открыт!» для класса.
 *  Формат из тикета: tmp_portal_grade_5_opened. */
export const portalOpenedKey = (grade: string) => `tmp_portal_grade_${grade}_opened`
