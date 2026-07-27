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
}
