/**
 * Метаданные 12 эпох — вынесены из app/mission/page.tsx (прогон
 * epoch-map-redesign, тикет 01). Общий источник для плаката
 * (EpochMapPoster) и мобильного списка. Ячейка матрицы задаётся ПО
 * ГРАММАТИКЕ (строка = время, колонка = аспект), а не по номеру изучения.
 */

export type EpochRow = "present" | "past" | "future"
export type EpochCol = "simple" | "continuous" | "perfect" | "perfectContinuous"

export interface EpochMeta {
  slug: string
  number: number
  title: string
  tagline: string
  icon: string
  cell: { row: EpochRow; col: EpochCol }
}

export const EPOCH_META: EpochMeta[] = [
  { number: 1, slug: "present-simple", title: "Present Simple", tagline: "База рутины", icon: "📸", cell: { row: "present", col: "simple" } },
  { number: 2, slug: "present-continuous", title: "Present Continuous", tagline: "Прямой эфир", icon: "🎥", cell: { row: "present", col: "continuous" } },
  { number: 3, slug: "past-simple", title: "Past Simple", tagline: "Архивы истории", icon: "📜", cell: { row: "past", col: "simple" } },
  { number: 4, slug: "past-continuous", title: "Past Continuous", tagline: "Петля времени", icon: "📼", cell: { row: "past", col: "continuous" } },
  { number: 5, slug: "present-perfect", title: "Present Perfect", tagline: "Сейсмическая активность", icon: "🎒", cell: { row: "present", col: "perfect" } },
  { number: 6, slug: "present-perfect-continuous", title: "Present Perfect Continuous", tagline: "Тлеющий провод", icon: "⏱️", cell: { row: "present", col: "perfectContinuous" } },
  { number: 7, slug: "future-simple", title: "Future Simple", tagline: "Прогноз катастрофы", icon: "🔮", cell: { row: "future", col: "simple" } },
  { number: 8, slug: "future-continuous", title: "Future Continuous", tagline: "Заселение Марса", icon: "⏭️", cell: { row: "future", col: "continuous" } },
  { number: 9, slug: "past-perfect", title: "Past Perfect", tagline: "Эффект бабочки", icon: "🎬", cell: { row: "past", col: "perfect" } },
  { number: 10, slug: "future-perfect", title: "Future Perfect", tagline: "Точка невозврата", icon: "🏁", cell: { row: "future", col: "perfect" } },
  { number: 11, slug: "past-perfect-continuous", title: "Past Perfect Continuous", tagline: "Скрытый мотив", icon: "🏃", cell: { row: "past", col: "perfectContinuous" } },
  { number: 12, slug: "future-perfect-continuous", title: "Future Perfect Continuous", tagline: "Вечный двигатель", icon: "⏱️⏭️", cell: { row: "future", col: "perfectContinuous" } },
]
