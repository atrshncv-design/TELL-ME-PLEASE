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
    // Add word bank to description
    const adverbs = raw.available_adverbs || []
    if (adverbs.length > 0) {
      raw.description = `${raw.description}\n\nНаречия: ${adverbs.join(", ")}`
    }
    raw.items = raw.items.map((i: any) => ({
      sentence: i.sentence_base + " ___",
      answer: i.adverb,
    }))
    raw.type = "fill-in"
  }

  // grammar_wh_questions: statement → sentence with ___ blank
  // Must check !raw.items[0].question to avoid intercepting yes_no items
  if (raw.items?.[0]?.statement && !raw.items[0].sentence && !raw.items[0].question) {
    raw.items = raw.items.map((i: any) => {
      const answer = i.answer
      const statement = i.statement
      // Extract question prefix greedily (e.g., "When does", "What do", "How often do")
      const prefixMatch = answer.match(/^(What|Where|When|How\s+\w+|Why|Who|Which)\s+(do|does|did|can|could|will|would|is|are|was|were)\s/i)
      let prefix = prefixMatch ? prefixMatch[0].trim() : ""
      // If no match with auxiliary, try just the question word
      if (!prefix) {
        const wordMatch = answer.match(/^(What|Where|When|How|Why|Who|Which)\s/i)
        prefix = wordMatch ? wordMatch[0].trim() : ""
      }
      // For does-items: remove -s from verb and lowercase subject
      let body = statement.replace(/\.$/, "")
      if (prefix.includes("does")) {
        // Remove -s/-es from verb: "hunts" → "hunt", "lives" → "live"
        body = body.replace(/\b(\w+)(s|es)\b/, (match: string, verb: string, suffix: string) => {
          // Don't modify nouns (elephant, lion, etc.)
          if (/^(elephant|lion|crocodile|goose|goldfish|tortoise|spider|butterfly|giraffe|rhino)$/i.test(verb)) {
            return match
          }
          return verb
        })
        // Lowercase the subject after auxiliary
        body = body.replace(/^([A-Z])/, (c: string) => c.toLowerCase())
      }
      return {
        sentence: `___ ${body}?`,
        answer: prefix,
        hint: i.hint,
      }
    })
  }

  // grammar_yes_no_questions: statement/question → quiz with options
  if (raw.items?.[0]?.statement && raw.items[0].question && !raw.items[0].options) {
    raw.items = raw.items.map((i: any) => {
      const q = i.question
      const s = i.statement
      const isDo = q.startsWith("Do ")
      // Swap Do/Does for wrongAux
      const wrongAux = isDo
        ? q.replace(/^Do\b/, "Does")
        : q.replace(/^Does\b/, "Do")
      // Strategy: find the verb in statement (which has -s for Does-items)
      // Then create wrongVerb by using the -s form in the question
      // For Does-items: "lives" → use "lives" in question
      // For Do-items: no -s in statement, so we need to add -s ourselves
      let wrongVerb = q
      if (isDo) {
        // Do-item: find the main verb in question and add -s
        // "Do you speak English?" → "speak" → "speaks"
        const parts = q.split(/\s+/)
        // Find verb: it's after the subject (you/they/we/I + optional noun)
        // Simple heuristic: find first word that's not Do/Does/pronoun/noun
        const pronouns = /^(I|you|we|they|he|she|it)$/i
        const stopwords = /^(Do|does|the|a|an|my|your|his|her|its|our|their|some|any|and|or)$/i
        for (let w = 1; w < parts.length; w++) {
          const word = parts[w].replace(/[?.!,]/g, "")
          if (!pronouns.test(word) && !stopwords.test(word) && w > 0) {
            // This might be the verb
            const sForm = word.endsWith("y")
              ? word.slice(0, -1) + "ies"
              : word + "s"
            wrongVerb = q.replace(new RegExp(`\\b${word}\\b`), sForm)
            break
          }
        }
      } else {
        // Does-item: find verb with -s in statement
        const statementWords = s.replace(/\.$/, "").split(/\s+/)
        const stopwords = /^(The|A|An|I|you|he|she|it|we|they|my|your|his|her|its|our|their|and|or|in|on|at|with|to|from)$/i
        for (const word of statementWords) {
          if (stopwords.test(word)) continue
          if (word.match(/s$/i) && !word.match(/ss$/i)) {
            // Found verb with -s: use it in question
            const baseForm = word
              .replace(/ies$/, "y")
              .replace(/(?:sh|ch|x|z|s)es$/, "")
              .replace(/ves$/, "f")
              .replace(/s$/, "")
            wrongVerb = q.replace(new RegExp(`\\b${baseForm}\\b`), word)
            if (wrongVerb !== q) break
          }
        }
      }
      // Filter out duplicates, keep exactly 3
      const unique = [...new Set([q, wrongAux, wrongVerb])]
      const options = unique.sort(() => Math.random() - 0.5)
      return {
        sentence: i.statement,
        options,
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
