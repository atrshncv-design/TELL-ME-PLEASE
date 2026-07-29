/** Unified data contracts for TELL ME PLEASE task JSON files. */

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
}
