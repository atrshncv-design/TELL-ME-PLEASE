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
  // Grammar Minecraft (тикет W3-T1): режим блоков-категорий + перестройка по временам.
  blocksMode?: boolean;
  blocks?: MinecraftTense[];
}

/** Категория блока-карточки Grammar Minecraft (W3-T1): подпись по-русски в UI. */
export type MinecraftBlockCategory =
  | "subject"
  | "auxiliary"
  | "verb"
  | "object"
  | "time"
  | "place";

/** Один блок-карточка: слово + его категория (ПОДЛЕЖАЩЕЕ / ПОМОЩНИК / ГЛАГОЛ / …). */
export interface MinecraftBlock {
  category: MinecraftBlockCategory;
  word: string;
}

/** Один вариант времени Grammar Minecraft (W3-T1): набор блоков предложения. */
export interface MinecraftTense {
  /** Идентификатор времени: "present" | "past" | "future" (свободная строка). */
  tense: string;
  /** Подпись кнопки «Сменить время», например "Present Simple". */
  label: string;
  blocks: MinecraftBlock[];
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
  // Grammar Minecraft (тикет W3-T1): режим блоков-категорий (blocksMode=true)
  // + варианты времени blocks[] (см. MinecraftTense выше).
  blocksMode?: boolean;
  blocks?: MinecraftTense[];
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
  // boss-battle (тикет W3-T3): цепочка 6 вызовов + финальный план поездки
  challenges?: BossBattleChallenge[];
  finalPlan?: BossBattleFinalPlan;
  // matching (тикет T05, станция B1.2 «Анализ Профилей»): сопоставление
  // описаний с профессиями — «Угадай профессию».
  matching?: MatchingData;
  // text-fix (тикет T06, станция B2.4 «Стабилизация Реальности»): найди и
  // исправь ошибки в тексте — клик по ошибочному слову → варианты исправления.
  textFix?: TextFixData;
  // voice-chat checklist (тикет T07, станции Речи A1.4/A2.4/B1.3/B2.3):
  // бот задаёт вопросы из списка по одному, ответ оценивается по маркерам.
  checklist?: VoiceChecklistItem[];
  // drag-and-drop (W3-T03 client-fixes-0808, станция B2.1 «Анализ Аномалий»):
  // review: true — после «Проверить» НЕ завершать упражнение автоматически:
  // показать разбор ошибок (зелёные верные / красные ошибочные) и кнопку
  // «Далее» → ResultScreen. Без флага — старое поведение (авто-финиш).
  review?: boolean;
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

/** Тип предложения в раунде Grammar Battle (W3-T2). */
export type GrammarBattleMode = "positive" | "negative" | "question";

/** Один раунд Grammar Battle (W3-T2): стимул + тип + слова-плитки + ответ. */
export interface GrammarBattleRound {
  /** Слово-стимул, например «play / now» (что строим). */
  stimulus: string;
  /** Тип предложения: утверждение / отрицание / вопрос. */
  mode: GrammarBattleMode;
  /** Слова-плитки в ПРАВИЛЬНОМ порядке (банк перемешивается в UI). */
  words: string[];
  /** Правильное предложение = words.join(" ") (сравнение без регистра). */
  answer: string;
  /** Таймер раунда в секундах (по умолчанию 20). */
  timeSec?: number;
}

/** Grammar Battle (W3-T2): быстрая сборка предложений на время, ⚡ Energy. */
export interface GrammarBattleData {
  /** Ровно 3 раунда (спека 6): positive / negative / question. */
  rounds: GrammarBattleRound[];
}

/** Тип вызова Grammar Boss (W3-T3). */
export type BossBattleChallengeType =
  | "fix-mistake"
  | "make-question"
  | "answer-partner"
  | "tell-past"
  | "describe-now"
  | "plan-future";

/** Один вызов Grammar Boss (W3-T3): выбор из 2-3 вариантов (паттерн QuizTask). */
export interface BossBattleChallenge {
  type: BossBattleChallengeType;
  /** Заголовок по-русски («Исправь ошибку» и т.п.). */
  title: string;
  /** Текст вызова: предложение с ошибкой / слова для вопроса / вопрос. */
  sentence?: string;
  /** fix-mistake: слово с ошибкой для зачёркивания (необязательно). */
  wrong?: string;
  /** make-question: подсказка-слова для вопроса (необязательно). */
  prompt?: string;
  options: string[];
  answer: string;
  /** Умная обратная связь (W1-T3) — идёт в hintFor первой. */
  wrongExplanation?: string;
}

/** Ключ требования финального плана (W3-T3). */
export type BossBattlePlanKind = "present" | "past" | "future" | "question" | "negative";

/** Одно предложение пула финального плана поездки (W3-T3). */
export interface BossBattlePlanSentence {
  text: string;
  kind: BossBattlePlanKind;
}

/** Финальное задание «планируем школьную поездку» (W3-T3): мультивыбор по минимумам. */
export interface BossBattleFinalPlan {
  /** Сценарий по-английски: «You are planning a school trip…». */
  intro: string;
  /** Пул предложений (~10-12): тап — выбрать/убрать, можно перевыбирать. */
  sentences: BossBattlePlanSentence[];
  /** Минимумы по типам (по умолчанию 2/2/2/1/1, сумма = 5 групп-требований). */
  requirements?: Partial<Record<BossBattlePlanKind, number>>;
}

/** Boss Battle (W3-T3): цепочка 6 вызовов + финальный план поездки, 🗣+⚡. */
export interface BossBattleData {
  challenges: BossBattleChallenge[];
  finalPlan: BossBattleFinalPlan;
}

/** Одно описание-профиль matching (T05, станция B1.2 «Анализ Профилей»):
 *  текст описания + профессии-варианты + правильная профессия (∈ options). */
export interface MatchingItem {
  /** Описание повседневных дел («He operates on sick people in a hospital.»). */
  text: string;
  /** Профессии-варианты для ЭТОГО описания (2–10, без дублей). */
  options: string[];
  /** Правильная профессия (обязана быть среди options). */
  answer: string;
}

/** Сопоставление описаний с профессиями (T05): «Угадай профессию». */
export interface MatchingData {
  items: MatchingItem[];
  /** Все профессии станции — легенда/подпись (необязательно). */
  columns?: string[];
}

/** Одна ошибка в предложении text-fix (T06): слово-ошибка + его исправление.
 *  `index` — позиция слова-ошибки в sentence по split(/\s+/) (0-based);
 *  токен по index обязан совпадать с `wrong` (регистронезависимо). */
export interface TextFixError {
  /** Индекс слова-ошибки в предложении (по словам). */
  index: number;
  /** Неверное слово («goes»). */
  wrong: string;
  /** Исправление («go»). */
  right: string;
  /** Варианты исправления: right + 2–3 дистрактора (необязательно; если
   *  нет — компонент генерирует дистракторы сам). */
  options?: string[];
}

/** Одно предложение с 1+ ошибками (text-fix). */
export interface TextFixSentence {
  /** Предложение с ошибкой (без разметки, дословно из документа). */
  sentence: string;
  /** 1+ ошибок в этом предложении. */
  errors: TextFixError[];
  /** Подсказка (по желанию). */
  hint?: string;
}

/** Один вопрос voice-chat checklist (тикет T07, станции Речи): бот задаёт
 *  вопрос из документа, ответ ученика оценивается по маркерам. */
export interface VoiceChecklistItem {
  /** Вопрос бота (из документа, дословно). */
  question: string;
  /** Слова-маркеры: вопрос засчитан, если в ответе встретилось >= min
   *  маркеров (эвристика \b-целых слов, как в one-minute). */
  markers: string[];
  /** Сколько маркеров нужно встретить (по умолчанию 1). */
  min?: number;
  /** Подсказка ученику (по-русски, по желанию). */
  hint?: string;
}

/** text-fix (T06): «Исправь N ошибок в тексте» — найди ошибочные слова и
 *  выбери исправление. Счёт = верно исправленные ошибки / всего ошибок. */
export interface TextFixData {
  sentences: TextFixSentence[];
  /** «Найди и исправь 8 ошибок в тексте». */
  instruction?: string;
}
