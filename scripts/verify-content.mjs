// Verify content normalization for all grade_5 JSON files
import { readFileSync } from "fs"
import { join } from "path"

const dir = join(process.cwd(), "frontend/public/content/tasks/grade_5")
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

// Inline normalize function (copy from page.tsx)
function normalize(raw) {
  if (raw.groups && Array.isArray(raw.groups)) {
    raw.items = raw.groups.flatMap((g) => g.items ?? [])
    delete raw.groups
  }
  if (raw.story && Array.isArray(raw.story)) {
    raw.items = raw.story
      .filter((s) => s.blank !== null && s.verb)
      .map((s) => ({ sentence: s.text, answer: s.answer, hint: s.verb }))
    delete raw.story
  }
  if (raw.sections && Array.isArray(raw.sections)) {
    raw.sections = raw.sections.map((s) => ({
      name: s.name,
      questions: s.questions ?? s.prompts ?? [],
    }))
  }
  if (raw.items?.[0]?.sentence_base) {
    const adverbs = raw.available_adverbs || []
    if (adverbs.length > 0) {
      raw.description = `${raw.description}\n\nНаречия: ${adverbs.join(", ")}`
    }
    raw.items = raw.items.map((i) => ({
      sentence: i.sentence_base + " ___",
      answer: i.adverb,
    }))
    raw.type = "fill-in"
  }
  // wh_questions: must check !question to avoid intercepting yes_no
  if (raw.items?.[0]?.statement && !raw.items[0].sentence && !raw.items[0].question) {
    raw.items = raw.items.map((i) => {
      const answer = i.answer
      const statement = i.statement
      const prefixMatch = answer.match(/^(What|Where|When|How\s+\w+|Why|Who|Which)\s+(do|does|did|can|could|will|would|is|are|was|were)\s/i)
      let prefix = prefixMatch ? prefixMatch[0].trim() : ""
      if (!prefix) {
        const wordMatch = answer.match(/^(What|Where|When|How|Why|Who|Which)\s/i)
        prefix = wordMatch ? wordMatch[0].trim() : ""
      }
      let body = statement.replace(/\.$/, "")
      if (prefix.includes("does")) {
        body = body.replace(/\b(\w+)(s|es)\b/, (match, verb, suffix) => {
          if (/^(elephant|lion|crocodile|goose|goldfish|tortoise|spider|butterfly|giraffe|rhino)$/i.test(verb)) {
            return match
          }
          return verb
        })
        body = body.replace(/^([A-Z])/, (c) => c.toLowerCase())
      }
      return { sentence: `___ ${body}?`, answer: prefix, hint: i.hint }
    })
  }
  if (raw.items?.[0]?.statement && raw.items[0].question && !raw.items[0].options) {
    raw.items = raw.items.map((i) => {
      const q = i.question
      const s = i.statement
      const isDo = q.startsWith("Do ")
      const wrongAux = isDo
        ? q.replace(/^Do\b/, "Does")
        : q.replace(/^Does\b/, "Do")
      let wrongVerb = q
      if (isDo) {
        const parts = q.split(/\s+/)
        const pronouns = /^(I|you|we|they|he|she|it)$/i
        const stopwords = /^(Do|does|the|a|an|my|your|his|her|its|our|their|some|any|and|or)$/i
        for (let w = 1; w < parts.length; w++) {
          const word = parts[w].replace(/[?.!,]/g, "")
          if (!pronouns.test(word) && !stopwords.test(word) && w > 0) {
            const sForm = word.endsWith("y") ? word.slice(0, -1) + "ies" : word + "s"
            wrongVerb = q.replace(new RegExp(`\\b${word}\\b`), sForm)
            break
          }
        }
      } else {
        const statementWords = s.replace(/\.$/, "").split(/\s+/)
        const stopwords = /^(The|A|An|I|you|he|she|it|we|they|my|your|his|her|its|our|their|and|or|in|on|at|with|to|from)$/i
        for (const word of statementWords) {
          if (stopwords.test(word)) continue
          if (word.match(/s$/i) && !word.match(/ss$/i)) {
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
      const unique = [...new Set([q, wrongAux, wrongVerb])]
      const options = unique.sort(() => Math.random() - 0.5)
      return { sentence: i.statement, options, answer: q }
    })
    raw.type = "quiz"
  }
  return raw
}

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
          console.log(`❌ ${file}[${j}]: quiz has <2 options`)
          errors++
        }
        if (!item.options.includes(item.answer)) {
          console.log(`❌ ${file}[${j}]: answer "${item.answer}" not in options: ${JSON.stringify(item.options)}`)
          errors++
        }
        // Check for duplicates
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
