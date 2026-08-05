/** Unified data contracts for time travel mission task JSON files. */

export interface QuizItem {
  question?: string;
  sentence?: string;
  subject?: string;
  options: string[];
  answer: string;
}

export interface FillItem {
  sentence: string;
  answer: string | string[];
  hint?: string;
}

export interface DragItem {
  verb: string;
  answer: string;
}

export interface Column {
  id: string;
  label: string;
  rule?: string;
}

export interface LadderData {
  id: string;
  direction: "up" | "down";
  title: string;
  steps: string[];
}

export interface DialogueLine {
  speaker: string;
  text: string;
}

export interface Section {
  name: string;
  questions: string[];
}

export interface BuildSentenceData {
  adverbs: string[];
  timePhrases: string[];
  baseVerb: string;
  subject: string;
}

/** One card of a flashcards task: stimulus on the front, reaction on the back. */
export interface FlashcardItem {
  front: string
  back: string
}

/** One round of a cloze task: a text with `___` blanks + bank. */
export interface ClozeRound {
  text: string;
  /** answers[i] = acceptable words for blank i (case-insensitive in UI). */
  answers: string[][];
  /** The chip bank (may include duplicates — tracked by index in the UI). */
  word_bank: string[];
  hints?: string[];
}

/** Cloze task: two-click fill mechanic (click blank → click word). */
export interface ClozeTextData {
  /** Single-round shape. */
  text?: string;
  answers?: string[][];
  word_bank?: string[];
  hints?: string[];
  underline_words?: string[];
  /** Multi-round shape (one text per round). */
  rounds?: ClozeRound[];
}

/** Один сектор «Колеса удачи»: слово/подлежащее + опциональный ответ для самопроверки. */
export interface WheelItem {
  label: string
  answer?: string
}

/** «Колесо удачи»: SVG-спиннер, выпавший сектор → самопроверка по кнопке «Показать ответ». */
export interface WheelTask extends TaskData {
  type: "wheel"
  items: WheelItem[]
}

export interface TaskData {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  items?: any[];
  columns?: any[];
  ladders?: any[];
  dialogue?: DialogueLine[];
  sections?: Section[];
  adverbs?: string[];
  time_phrases?: string[];
  base_verb?: string;
  subject?: string;
  // cloze
  text?: string;
  answers?: string[][];
  word_bank?: string[];
  underline_words?: string[];
  rounds?: ClozeRound[];
  // flashcards
  cards?: FlashcardItem[];
  /** voice-chat: системный промпт-роль из контента (тикет P6, «Спроси учителя»). */
  task_context?: string;
  // choose-story (тикет W1-T4): выбор героя/места/проблемы → рассказ по схеме.
  scaffold?: "full" | "keywords";
  characters?: string[];
  places?: string[];
  problems?: string[];
  sentencePatterns?: string[];
  keywords?: string[];
}

/** Одно предложение задания «Кликни на ошибку» (click-mistake). */
export interface ClickMistakeItem {
  /** Предложение целиком; слова разделены пробелами, пунктуация приклеена к словам. */
  text: string;
  /** Слово с ошибкой, по которому надо кликнуть. null = «ловушка»: ошибки нет. */
  wrong: string | null;
}

/** «Кликни на ошибку»: найди и кликни неверное слово (или подтверди, что всё верно). */
export interface ClickMistakeTask extends TaskData {
  items: ClickMistakeItem[];
}

/** Choose Your Story (W1-T4): выбор героя/места/проблемы → рассказ по схеме. */
export interface ChooseStoryData {
  /** "full" = готовые начала предложений (select-ы), "keywords" = свободный ввод. */
  scaffold: "full" | "keywords";
  characters: string[];
  places: string[];
  problems: string[];
  /** Шаблоны предложений с плейсхолдерами {char}/{place}/{problem}. */
  sentencePatterns: string[];
  /** Ключевые слова для scaffold="keywords" (показываются как подсказка). */
  keywords?: string[];
}
