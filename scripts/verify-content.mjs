// Verify content normalization for all grade_5 JSON files
// Imports normalize from scripts/normalize.mjs (single source of truth)
import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { normalize } from "./normalize.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const dir = join(__dirname, "../frontend/public/content/tasks/grade_5")
const files = [
  "grammar_endings_sort.json",
  "grammar_endings_quiz.json",
  "grammar_v1_vs_quiz.json",
  "grammar_roulette.json",
  "grammar_joke_quiz.json",
  "grammar_negation.json",
  "grammar_yes_no_questions.json",
  "grammar_wh_questions.json",
  "grammar_ladder.json",
  "grammar_verb_forms_quiz.json",
  "grammar_adverbs_build.json",
  "grammar_adverbs_place.json",
  "story_harry_potter_routine.json",
  "story_harry_potter_interview.json",
  "speaking_about_yourself.json",
  "speaking_peer_conversation.json",
]

let errors = 0
for (const file of files) {
  try {
    const raw = JSON.parse(readFileSync(join(dir, file), "utf-8"))
    const task = normalize(raw)
    const items = task.items || []
    
    if (task.type === "quiz") {
      for (let j = 0; j < items.length; j++) {
        const item = items[j]
        if (!item.options || !Array.isArray(item.options)) {
          console.log(`❌ ${file}[${j}]: quiz item missing options`)
          errors++
          continue
        }
        if (item.options.length < 2) {
          console.log(`❌ ${file}[${j}]: quiz has ${item.options.length} options (need ≥2): ${JSON.stringify(item.options)}`)
          errors++
        }
        if (!item.options.includes(item.answer)) {
          console.log(`❌ ${file}[${j}]: answer "${item.answer}" not in options: ${JSON.stringify(item.options)}`)
          errors++
        }
        if (new Set(item.options).size !== item.options.length) {
          console.log(`❌ ${file}[${j}]: duplicate options: ${JSON.stringify(item.options)}`)
          errors++
        }
      }
    }
    
    if (task.type === "fill-in") {
      for (let j = 0; j < items.length; j++) {
        const item = items[j]
        if (!item.sentence || !item.sentence.includes("___")) {
          console.log(`❌ ${file}[${j}]: fill-in item missing ___ in sentence: "${item.sentence}"`)
          errors++
        }
        if (!item.answer || item.answer === "") {
          console.log(`❌ ${file}[${j}]: fill-in item has empty answer`)
          errors++
        }
      }
    }
    
    if (items.length === 0 && task.type !== "role-play" && task.type !== "voice-chat") {
      console.log(`⚠️ ${file}: no items (type=${task.type})`)
    }
    
    console.log(`✅ ${file}: type=${task.type}, items=${items.length}`)
  } catch (e) {
    console.log(`❌ ${file}: ${e.message}`)
    errors++
  }
}

console.log(`\n${errors === 0 ? "✅ ALL PASSED" : `❌ ${errors} ERRORS FOUND`}`)
process.exit(errors === 0 ? 0 : 1)
