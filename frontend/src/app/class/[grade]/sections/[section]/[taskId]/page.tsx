import fs from "fs/promises"
import path from "path"
import { notFound } from "next/navigation"
import { TaskRenderer } from "./TaskRenderer"
import type { TaskData } from "@/types/task"

/**
 * Normalizes raw JSON data to match component contracts.
 * Handles field renames, structural flattening, and type coercion
 * for legacy JSON files that predate the unified schema.
 */
function normalize(raw: Record<string, any>): TaskData {
  // grammar_endings_quiz: groups → flat items
  if (raw.groups && Array.isArray(raw.groups)) {
    raw.items = raw.groups.flatMap((g: any) => g.items ?? [])
    delete raw.groups
  }

  // story_harry_potter_routine: story → items, text → sentence
  if (raw.story && Array.isArray(raw.story)) {
    raw.items = raw.story
      .filter((s: any) => s.blank !== null && s.verb)
      .map((s: any) => ({ sentence: s.text, answer: s.answer, hint: s.verb }))
    delete raw.story
  }

  // speaking_about_yourself: prompts → questions in sections
  if (raw.sections && Array.isArray(raw.sections)) {
    raw.sections = raw.sections.map((s: any) => ({
      name: s.name,
      questions: s.questions ?? s.prompts ?? [],
    }))
  }

  // grammar_adverbs_place: sentence_base → sentence, answer_position → answer
  if (raw.items?.[0]?.sentence_base) {
    raw.items = raw.items.map((i: any) => ({
      sentence: i.sentence_base + " ___",
      answer: i.adverb,
    }))
    raw.type = "fill-in"
  }

  // grammar_wh_questions: statement → sentence with ___ blank
  if (raw.items?.[0]?.statement && !raw.items[0].sentence) {
    raw.items = raw.items.map((i: any) => {
      const answer = i.answer
      const statement = i.statement
      // Extract question prefix (e.g., "When does", "What do", "Where does")
      const prefixMatch = answer.match(/^(What|Where|When|How|Why|Who|Which)\s+(do|does|did|can|could|will|would|is|are|was|were)\s/i)
      let prefix = prefixMatch ? prefixMatch[0].trim() : ""
      // If no match, try just the question word
      if (!prefix) {
        const wordMatch = answer.match(/^(What|Where|When|How|Why|Who|Which)\s/i)
        prefix = wordMatch ? wordMatch[0].trim() : ""
      }
      // Build the sentence with blank at the start
      const sentence = `___ ${statement.replace(/\.$/, "")}?`
      return {
        sentence,
        answer: prefix,
        hint: i.hint,
      }
    })
  }

  // grammar_yes_no_questions: statement/question → quiz with options
  if (raw.items?.[0]?.statement && raw.items[0].question && !raw.items[0].options) {
    raw.items = raw.items.map((i: any) => {
      const q = i.question
      // Swap Do/Does
      const wrongAux = q.startsWith("Do ")
        ? q.replace(/^Do\b/, "Does")
        : q.replace(/^Does\b/, "Do")
      // Find the main verb (after subject) and add -s
      const verbMatch = q.match(/\b(do|does)\s+\w+\s+(\w+)/i)
      const mainVerb = verbMatch ? verbMatch[2] : ""
      const wrongVerb = mainVerb
        ? q.replace(new RegExp(`\\b${mainVerb}\\b`), mainVerb + "s")
        : q
      // Shuffle options so correct answer isn't always first
      const opts = [q, wrongAux, wrongVerb].filter((v, idx, arr) => arr.indexOf(v) === idx && v !== q)
      while (opts.length < 3) opts.push(q.split(" ").slice(0, -1).join(" ") + "?")
      const shuffled = [q, ...opts].sort(() => Math.random() - 0.5)
      return {
        sentence: i.statement,
        options: shuffled.slice(0, 3),
        answer: q,
      }
    })
    raw.type = "quiz"
  }

  return raw as TaskData
}

function validate(task: TaskData, taskId: string): boolean {
  const required = ["id", "title", "type", "category"] as const
  for (const field of required) {
    if (!task[field]) {
      console.error(`[TaskPage] Missing required field "${field}" in ${taskId}.json`)
      return false
    }
  }
  return true
}

async function loadTask(grade: string, taskId: string): Promise<TaskData | null> {
  const filePath = path.join(process.cwd(), "public", "content", "tasks", `grade_${grade}`, `${taskId}.json`)
  try {
    const raw = await fs.readFile(filePath, "utf-8")
    const task = normalize(JSON.parse(raw))
    if (!validate(task, taskId)) {
      return null
    }
    return task
  } catch (err) {
    console.error("[TaskPage] File not found:", filePath, err)
    return null
  }
}

export default async function TaskPage({ params }: { params: Promise<{ grade: string; section: string; taskId: string }> }) {
  const { grade, taskId } = await params
  const task = await loadTask(grade, taskId)

  if (!task) {
    notFound()
  }

  return <TaskRenderer task={task} grade={grade} />
}
