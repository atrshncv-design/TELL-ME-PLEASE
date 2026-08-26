/**
 * Вердикт instant-check (тикет 03, pravki-150826): единые тайминги и стили
 * для заданий с мгновенной проверкой выбора варианта.
 *
 * Граница (spec §verdict style helper): хелпер владеет константами классов и
 * таймингов; логика таймеров остаётся в конкретных тасках.
 *
 * Правило UX: неверный выбор ученика — сильный красный вердикт (сплошная
 * заливка danger + крупный ✗), чтобы его невозможно было принять за верный;
 * правильный вариант при ошибке показывается спокойно, БЕЗ праздничной
 * награды (scale-пульсация и зелёная галочка) — вместо неё спокойная строка
 * «Правильный ответ: …» под вариантами. Наградная пульсация и ✓ остаются
 * только на своём верном выборе.
 */

/** Задержка авто-перехода после ВЕРНОГО ответа (как было, ~0.9 c). */
export const CORRECT_ADVANCE_MS = 900

/** Задержка авто-перехода после НЕВЕРНОГО ответа (~1.8 c): время разглядеть
 *  вердикт и спокойную строку с правильным вариантом. */
export const WRONG_HOLD_MS = 1800

/** Тайминг авто-перехода по факту ответа. */
export function advanceDelayMs(correct: boolean): number {
  return correct ? CORRECT_ADVANCE_MS : WRONG_HOLD_MS
}

/** Префикс спокойной строки с правильным ответом при неверном выборе. */
export const CORRECT_ANSWER_PREFIX = "Правильный ответ:"

/** Классы спокойной плашки «Правильный ответ: …» (нейтральный slate,
 *  без success-зелени и анимаций награды). */
export const CALM_ANSWER_LINE_CLASS =
  "rounded-2xl bg-slate-100 px-4 py-3 text-center text-base font-semibold text-slate-600"

export interface VerdictOptionStyle {
  /** Классы кнопки варианта: фон/рамка. */
  box: string
  /** Классы кружка с буквой варианта. */
  chip: string
  /** Классы текста варианта (на сплошном красном — белый). */
  label: string
  /** Символ вердикта («✓»/«✗») или null — без символа. */
  mark: string | null
  /** Классы контейнера символа (пусто — глиф без бейджа). */
  markWrapClass: string
  /** Классы глифа символа. */
  markClass: string
  /** Праздничная scale-пульсация награды — ТОЛЬКО на своём верном выборе. */
  celebrate: boolean
  /** Тряска своего неверного выбора. */
  shake: boolean
}

const IDLE_BOX = "bg-white border-2 border-primary-200 hover:border-primary-400"
const IDLE_CHIP = "bg-primary-100 text-primary-700"
const LABEL_INK = "text-slate-800"

/**
 * Стиль одного варианта в момент вердикта.
 *
 * @param checked            вердикт показан (ответ проверен)
 * @param isCorrect          это правильный вариант
 * @param isSelected         этот вариант выбрал ученик
 * @param answeredCorrectly  ученик в итоге ответил верно (selected === answer)
 */
export function optionVerdictStyle(state: {
  checked: boolean
  isCorrect: boolean
  isSelected: boolean
  answeredCorrectly: boolean
}): VerdictOptionStyle {
  const { checked, isCorrect, isSelected, answeredCorrectly } = state

  // До проверки: выбор просто подсвечен (в instant-check тасках момент
  // мгновенный, ветка осталась для тасков с отложенной проверкой).
  if (!checked) {
    return {
      box: isSelected ? "bg-primary-100 border-2 border-primary-600" : IDLE_BOX,
      chip: isSelected ? "bg-primary-600 text-white" : IDLE_CHIP,
      label: LABEL_INK,
      mark: null,
      markWrapClass: "",
      markClass: "",
      celebrate: false,
      shake: false,
    }
  }

  // Свой верный выбор: награда — зелёный + пульсация + ✓ (как раньше).
  if (isCorrect && answeredCorrectly) {
    return {
      box: "bg-success/10 border-2 border-success",
      chip: "bg-success text-white",
      label: LABEL_INK,
      mark: "✓",
      markWrapClass: "",
      markClass: "text-xl font-black text-success",
      celebrate: true,
      shake: false,
    }
  }

  // Правильный вариант при ОШИБКЕ ученика: спокойная нейтральная подсветка —
  // без пульсации-награды и без зелёной галочки (тикет 03).
  if (isCorrect) {
    return {
      box: "bg-primary-50 border-2 border-primary-200",
      chip: IDLE_CHIP,
      label: LABEL_INK,
      mark: null,
      markWrapClass: "",
      markClass: "",
      celebrate: false,
      shake: false,
    }
  }

  // Неверный ВЫБРАННЫЙ вариант: сильный красный вердикт — сплошная заливка
  // danger, белые буквы и крупный ✗ в белом кружке; визуально сильнее зелёного.
  if (isSelected) {
    return {
      box: "bg-danger border-2 border-danger shadow-lg shadow-danger/30",
      chip: "bg-white text-danger",
      label: "text-white",
      mark: "✗",
      markWrapClass:
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white",
      markClass: "text-base font-black leading-none text-danger",
      celebrate: false,
      shake: true,
    }
  }

  // Остальные варианты после проверки — нейтральные.
  return {
    box: IDLE_BOX,
    chip: IDLE_CHIP,
    label: LABEL_INK,
    mark: null,
    markWrapClass: "",
    markClass: "",
    celebrate: false,
    shake: false,
  }
}
