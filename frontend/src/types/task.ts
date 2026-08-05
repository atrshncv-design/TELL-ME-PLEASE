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
  // one-minute (тикет W2-T1): One-Minute Challenge — тема, таймер, условия.
  topic?: string;
  duration?: number;
  conditions?: OneMinuteCondition[];
  // build-chat (тикет W2-T3): чат с пропусками + неожиданное событие.
  chat?: BuildChatMessage[];
  event?: BuildChatEvent;
  // survival-island (тикет W2-T2): «говори от лица команды» — категории-реплики.
  steps?: SurvivalIslandStep[];
  // escape-room (тикет W2-T4): цепочка 5 станций Grammar Escape Room.
  stations?: EscapeRoomStation[];
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

/** Одно сообщение чата с пропуском (build-chat, W2-T3). */
export interface BuildChatMessage {
  /** A = ученик, B = собеседник (друг). */
  from: "A" | "B";
  /** Текст сообщения ровно с одним пропуском "_" (выбор формы из options). */
  text: string;
  options: string[];
  answer: string;
  /** Подсказка при неверной форме (идёт в hintFor). */
  wrongExplanation?: string;
}

/** Одна реплика-ответ ученика после неожиданного события (build-chat). */
export interface BuildChatReply {
  /** Необязательная реплика собеседника, на которую отвечает ученик. */
  prompt?: string;
  options: string[];
  /** Верный = логичный ответ (коммуникативный выбор, не грамматика). */
  answer: string;
  wrongExplanation?: string;
}

/** Неожиданное событие, прерывающее переписку (build-chat, W2-T3). */
export interface BuildChatEvent {
  title: string;
  text: string;
  /** 2-3 реплики-ответа ученика (спека 5, тикет W2-T3). */
  replies: BuildChatReply[];
}

/** Одно грамматическое условие One-Minute Challenge (W2-T1). */
export interface OneMinuteCondition {
  /** Подпись по-русски, например «Используй 5 глаголов в Present Simple». */
  label: string;
  /** Подсказка: примеры слов/фраз. */
  hint: string;
  /** Слова-маркеры: условие выполнено, если в речи встретилось >= min из них. */
  markers: string[];
  /** Сколько маркеров нужно встретить (по умолчанию 1). */
  min?: number;
}

/** One-Minute Challenge (W2-T1): тема + таймер + грамматические условия. */
export interface OneMinuteData {
  /** Тема по-русски («Мой распорядок дня» и т.п.). */
  topic: string;
  /** Длительность в секундах (по умолчанию 60). */
  duration?: number;
  conditions: OneMinuteCondition[];
}

/** Одна категория-реплика Survival Island (W2-T2): ученик говорит ОТ ЛИЦА КОМАНДЫ. */
export interface SurvivalIslandStep {
  /** Ключ категории: have | doing | found | will | must. */
  key: string;
  /** Подпись категории по-русски («Что у вас ЕСТЬ»). */
  labelRu: string;
  /** Пример реплики на английском («We have a tent.»). */
  example: string;
  /** Опора scaffold=full: шаблон с пропуском («We have ___»). */
  template?: string;
  /** Подсказка-словарик для шаблона («a tent, water, food…»). */
  wordHint?: string;
  /** Опора scaffold=conditions: условное предложение-образец
   *  («If it rains, we will stay in the tent»). */
  condition?: string;
  /** Слова-маркеры категории: категория засчитана, если в реплике
   *  встретилось >= min маркеров (эвристика \\b-целых слов, как в one-minute). */
  markers: string[];
  /** Сколько маркеров нужно встретить (по умолчанию 1). */
  min?: number;
}

/** Survival Island (W2-T2): 5 категорий-реплик от лица команды + опоры. */
export interface SurvivalIslandData {
  /** "full" (5–6 кл.) = шаблоны «We have ___» + словарик; "keywords" /
   *  "conditions" (8–9 кл.) = свободная речь по условным образцам. */
  scaffold?: "full" | "keywords" | "conditions";
  steps: SurvivalIslandStep[];
  /** Дополнительные условия для 8–9 кл. (считаются как бонус-баллы). */
  conditions?: OneMinuteCondition[];
}

/** Типы станций Grammar Escape Room (W2-T4). */
export type EscapeRoomStationType =
  | "fill-gap"
  | "fix-mistake"
  | "make-question"
  | "full-answer"
  | "code-phrase";

/** Одна станция Grammar Escape Room (W2-T4): тип + заголовок + данные. */
export interface EscapeRoomStation {
  type: EscapeRoomStationType;
  title: string;
  data: {
    /** fill-gap: предложение с ___ (вставь форму глагола). */
    sentence?: string;
    /** fix-mistake: ошибочное слово для зачёркивания (необязательно). */
    wrong?: string;
    /** make-question: подсказка/слова для вопроса. */
    prompt?: string;
    /** full-answer: вопрос, на который отвечаем полным предложением. */
    question?: string;
    /** code-phrase: кодовую фразу произносим вслух. */
    phrase?: string;
    /** code-phrase: ключевые слова для зачёта распознанного текста. */
    keywords?: string[];
    /** Выбор для станций-выборов (fill-gap/fix-mistake/make-question/full-answer). */
    options?: string[];
    answer?: string;
    /** Умная обратная связь (W1-T3) — идёт в hintFor первой. */
    wrongExplanation?: string;
    explanation?: string;
    hint?: string;
  };
}

/** Grammar Escape Room (W2-T4): цепочка 5 станций + прогресс дверей. */
export interface EscapeRoomData {
  stations: EscapeRoomStation[];
}
