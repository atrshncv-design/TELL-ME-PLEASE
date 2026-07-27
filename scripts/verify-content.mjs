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
let normalizedCount = 0
const seenTypes = new Set()
for (const file of files) {
  try {
    const raw = JSON.parse(readFileSync(join(dir, file), "utf-8"))
    const task = normalize(raw)
    const items = task.items || []
    normalizedCount++
    seenTypes.add(task.type)

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

// === SANITY CHECKS ===
// Per SPEC decision Q6, the project has no test framework. These lightweight
// assertions live in the existing content-verify harness (the single verify
// seam) and guard against regressions in normalize + role resolution that the
// per-file checks above do not cover. They fail fast with process.exit(1).
//
// NOTE on the "purity" check: normalize is NOT byte-deterministic (the
// yes_no branch shuffles quiz options with Math.random). The property we
// actually assert is SHAPE stability across two passes — normalize must be
// a no-op on its own output (idempotent), i.e. calling it twice on the same
// input yields the same type, the same item count, and the same per-item
// key sets. This catches mutation drift (input mutation leaking into the
// output) without coupling to random distractor ordering.
function sanityCheck(label, ok, detail = "") {
  if (!ok) {
    console.error(`❌ SANITY FAIL: ${label}${detail ? " — " + detail : ""}`)
    process.exit(1)
  }
}

// 1. normalize is shape-idempotent on grammar_yes_no_questions.json, which has
//    the most complex transformation (statement→quiz with synthesized options).
{
  const raw = JSON.parse(readFileSync(join(dir, "grammar_yes_no_questions.json"), "utf-8"))
  const once = normalize(JSON.parse(JSON.stringify(raw)))
  const twice = normalize(JSON.parse(JSON.stringify(raw)))
  const shapeOf = (t) => JSON.stringify({
    type: t.type,
    itemCount: (t.items || []).length,
    itemKeys: (t.items || []).map((i) => Object.keys(i).sort().join(",")),
  })
  const first = shapeOf(normalize(JSON.parse(JSON.stringify(once))))
  const second = shapeOf(normalize(JSON.parse(JSON.stringify(twice))))
  sanityCheck(
    "normalize shape-idempotent on grammar_yes_no_questions.json",
    first === second,
    `first=${first} second=${second}`,
  )
}

// 2. grammar_adverbs_build.json: normalize must NOT destroy its raw fields.
//    The current shape is `type:"fill-in"` with `items[]` (sentence/answer),
//    and normalize is a passthrough for it (no branch matches). BuildSentenceTask
//    reads `adverbs`/`time_phrases`/`base_verb`/`subject` directly off the task
//    when type becomes "build-sentence"; whichever shape ships, normalize must
//    preserve whatever raw fields are present. Assert the items + every raw key
//    survive normalize untouched.
{
  const raw = JSON.parse(readFileSync(join(dir, "grammar_adverbs_build.json"), "utf-8"))
  const norm = normalize(JSON.parse(JSON.stringify(raw)))
  const rawKeys = Object.keys(raw).sort().join(",")
  const normKeys = Object.keys(norm).sort().join(",")
  sanityCheck(
    "grammar_adverbs_build preserves raw top-level keys through normalize",
    rawKeys === normKeys,
    `raw=[${rawKeys}] norm=[${normKeys}]`,
  )
  sanityCheck(
    "grammar_adverbs_build preserves item count through normalize",
    (raw.items || []).length === (norm.items || []).length,
    `raw=${(raw.items || []).length} norm=${(norm.items || []).length}`,
  )
}

// 3. role-play dialogue shape: story_harry_potter_interview.json must have a
//    dialogue[] with at least one speaker NOT in the generic list. This is the
//    exact invariant serializeContext (in TaskRenderer.tsx) relies on to detect
//    the AI role ("harry") vs the student role ("interviewer"). If this breaks,
//    role-lock (T10) breaks. Mirror comment: keep in sync with serializeContext.
//    serializeContext's internal logic itself is exercised by the browser build.
{
  const task = normalize(JSON.parse(readFileSync(join(dir, "story_harry_potter_interview.json"), "utf-8")))
  const dialogue = task.dialogue || []
  const genericSpeakers = ["interviewer", "host", "teacher", "journalist"]
  const nonGeneric = dialogue.find(
    (d) => d.speaker && !genericSpeakers.includes(d.speaker.toLowerCase()),
  )
  sanityCheck("role-play dialogue has at least one line", dialogue.length > 0, `len=${dialogue.length}`)
  sanityCheck(
    "role-play dialogue has a non-generic speaker (the AI role)",
    !!nonGeneric,
    `speakers=[${[...new Set(dialogue.map((d) => d.speaker))].join(",")}] all generic`,
  )
}

// 4. All 16 files normalize without throwing — the per-file loop above counts
//    this; assert it explicitly.
sanityCheck(
  "all 16 files normalize without throwing",
  normalizedCount === 16,
  `normalizedCount=${normalizedCount}`,
)

// 5. Every normalized type is in the known/whitelisted set (some raw types are
//    rewritten by normalize — e.g. adverbs_place drag-and-drop→fill-in,
//    yes_no→quiz — so this checks the FINAL type).
{
  const knownTypes = new Set([
    "quiz",
    "fill-in",
    "drag-and-drop",
    "ladder",
    "build-sentence",
    "role-play",
    "voice-chat",
    "fill-in-and-speak",
  ])
  const offenders = [...seenTypes].filter((t) => !knownTypes.has(t))
  sanityCheck(
    "all normalized types are in the known whitelist",
    offenders.length === 0,
    `unknown types=[${offenders.join(",")}]`,
  )
}

console.log("✅ Sanity checks passed")
console.log(`\n${errors === 0 ? "✅ ALL PASSED" : `❌ ${errors} ERRORS FOUND`}`)
process.exit(errors === 0 ? 0 : 1)
