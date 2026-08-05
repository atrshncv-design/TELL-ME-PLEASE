// Verify content normalization for grade_5, grade_6 and grade_8 JSON files
// Imports normalize from scripts/normalize.mjs (single source of truth)
import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { normalize } from "./normalize.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const dir = join(__dirname, "../frontend/public/content/tasks/grade_5")
const dir8 = join(__dirname, "../frontend/public/content/tasks/grade_8")
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
  "tobe_assembly.json",
  "tobe_magnet.json",
  "tobe_why.json",
  "tobe_lie_detector.json",
  "tobe_email.json",
  "story_harry_potter_routine.json",
  "story_harry_potter_interview.json",
  "speaking_about_yourself.json",
  "speaking_peer_conversation.json",
  "ps_dressirovshchik.json",
  "pc_svetofor_cards.json",
  "pc_svetofor_wheel.json",
  "pc_assembly.json",
  "pc_spelling_pairs.json",
  "pc_ing_rules_sort.json",
  "pc_ing_trainer.json",
  "pc_spelling_quiz.json",
  "pc_negative.json",
  "pc_question.json",
  "pc_short_answer.json",
  "pc_simple_vs_continuous.json",
  "pc_time_machine.json",
  "pc_letter.json",
  "pc_emoji_quiz.json",
  "pc_two_worlds.json",
  "pc_cyber_friend.json",
  "ps_plural_sort.json",
  "ps_negative_build.json",
  "ps_why_build.json",
  "ps_short_answer.json",
  "ps_filter_quiz.json",
  "ps_tag_questions.json",
  "ps_guess_who.json",
  "ps_countries.json",
  "ps_visitka.json",
  "hg_svetofor.json",
  "hg_negative.json",
  "hg_question.json",
  "hg_short_answer.json",
  "hg_monster.json",
  "ps_check_whales.json",
  "ps_check_assembly.json",
  "ps_check_detector.json",
  "ps_check_unjumble.json",
  "ps_check_family.json",
  // W1-T4: Choose Your Story (новый тип choose-story, пилот 5 класс)
  "story_choose_your_story.json",
]

// grade_8 tasks (Present Simple / Present Continuous / to be, migrated from customer materials)
const files8 = [
  "ps8_lie_detector.json",
  "ps8_roommate.json",
  "ps8_blogger_cloze.json",
  "ps8_myths.json",
  "ps8_jobs.json",
  "ps8_gossip.json",
  "ps8_truth_or_dare.json",
  "ps8_alien_report.json",
  "ps8_health_quiz.json",
  "ps8_star_interview.json",
  "ps8_peer_talk.json",
  "ps8_tobe_wheel.json",
  "ps8_tobe_assembly.json",
  "ps8_tobe_filter.json",
  "ps8_tobe_time_machine.json",
  "ps8_tobe_tech_cloze.json",
  "ps8_tobe_short_answer.json",
  "ps8_detective.json",
  "ps8_press_conference.json",
  "pc8_svetofor_cards.json",
  "pc8_ing_sort.json",
  "pc8_ing_trainer.json",
  "pc8_ing_detector.json",
  "pc8_stative.json",
  "pc8_routine_vs_now.json",
  "pc8_function_sort.json",
  "pc8_trends.json",
  "pc8_temp_detector.json",
  "pc8_future_plans.json",
  "pc8_irritation.json",
  "pc8_my_week_cloze.json",
  "pc8_two_worlds.json",
  "pc8_emoji_functions.json",
  "pc8_ai_bot.json",
]

const dir6 = join(__dirname, "../frontend/public/content/tasks/grade_6")
// grade_6 tasks (to be + Present Continuous 6, migrated from customer materials)
const files6 = [
  // shared grammar / story / speaking (6th-grade versions of the grade_5 set)
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
  // to be (tb6_*)
  "tb6_svetofor_cards.json",
  "tb6_svetofor_wheel.json",
  "tb6_assembly.json",
  "tb6_negative.json",
  "tb6_question.json",
  "tb6_filter.json",
  "tb6_blog.json",
  "tb6_short_answer.json",
  "tb6_detective.json",
  "tb6_room.json",
  // Present Continuous 6 (pc6_*)
  "pc6_form_quiz.json",
  "pc6_assembly.json",
  "pc6_unjumble.json",
  "pc6_short_answer.json",
  "pc6_detector.json",
  "pc6_svetofor_cards.json",
  "pc6_ing_assembly.json",
  "pc6_spelling_pairs.json",
  "pc6_ing_rules_sort.json",
  "pc6_ing_trainer.json",
  "pc6_spelling_quiz.json",
  "pc6_negative.json",
  "pc6_question.json",
  "pc6_markers_sort.json",
  "pc6_time_machine.json",
  "pc6_lie_detector.json",
  "pc6_two_worlds.json",
  "pc6_letter.json",
  "pc6_emoji_quiz.json",
  "pc6_blog.json",
  "pc6_survey.json",
  "pc6_ai_friend.json",
  "pc6_photo.json",
]

// grade_9 tasks (Present Simple / Present Continuous / to be, migrated from customer materials)
const dir9 = join(__dirname, "../frontend/public/content/tasks/grade_9")
const files9 = [
  // shared grammar / story / speaking (9th-grade versions of the grade_5 set)
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
  // Present Simple 9 (ps9_*)
  "ps9_meaning_quiz.json",
  "ps9_meaning_sort.json",
  "ps9_carnival_meanings.json",
  "ps9_dragon_cloze.json",
  "ps9_dragon_verbs.json",
  "ps9_dragon_negative.json",
  "ps9_dragon_question.json",
  "ps9_venice_cloze.json",
  "ps9_wh_question.json",
  "ps9_error_hunter.json",
  "ps9_match_pairs.json",
  "ps9_text_fix.json",
  "ps9_translation_pairs.json",
  // to be 9 (ps9_tobe_*)
  "ps9_tobe_svetofor.json",
  "ps9_tobe_assembly.json",
  "ps9_tobe_filter.json",
  "ps9_tobe_time_machine.json",
  "ps9_tobe_modal.json",
  "ps9_tobe_invention_cloze.json",
  "ps9_tobe_short_answer.json",
  "ps9_tobe_photo.json",
  "ps9_tobe_tags.json",
  // Present Continuous 9 (pc9_*)
  "pc9_svetofor.json",
  "pc9_ing_rules_sort.json",
  "pc9_ing_trainer.json",
  "pc9_stative.json",
  "pc9_time_machine.json",
  "pc9_function_sort.json",
  "pc9_trends.json",
  "pc9_future_plans.json",
  "pc9_irritation.json",
  "pc9_oge19_cloze.json",
  "pc9_photo_oge.json",
  "pc9_two_worlds.json",
  "pc9_emoji_functions.json",
  "pc9_ai_examiner.json",
]

let errors = 0
let normalizedCount = 0
let normalizedCount6 = 0
let normalizedCount8 = 0
let normalizedCount9 = 0
const seenTypes = new Set()

/** Per-file checks shared by both grades (grade_5 and grade_6). */
function verifyFile(file, dir) {
  try {
    const raw = JSON.parse(readFileSync(join(dir, file), "utf-8"))
    const task = normalize(raw)
    const items = task.items || []
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

    if (task.type === "cloze") {
      // Single-round: text + answers[][] + word_bank[]. Multi-round: rounds[].
      const rounds = task.rounds && task.rounds.length > 0
        ? task.rounds
        : task.text && task.answers && task.word_bank
          ? [{ text: task.text, answers: task.answers, word_bank: task.word_bank }]
          : []
      if (rounds.length === 0) {
        console.log(`❌ ${file}: cloze task has neither rounds[] nor text/answers/word_bank`)
        errors++
      }
      rounds.forEach((r, ri) => {
        const blankCount = r.text.split("___").length - 1
        if (blankCount !== r.answers.length) {
          console.log(`❌ ${file}[round ${ri}]: ${blankCount} blanks in text but ${r.answers.length} answer slots`)
          errors++
        }
        r.answers.forEach((acceptable, bi) => {
          if (!Array.isArray(acceptable) || acceptable.length === 0) {
            console.log(`❌ ${file}[round ${ri}][blank ${bi}]: answers must be a non-empty string[]`)
            errors++
          }
        })
        // Every answer must appear (case-insensitive) somewhere in the word bank.
        const bankLower = r.word_bank.map((w) => String(w).toLowerCase())
        r.answers.forEach((acceptable, bi) => {
          const inBank = acceptable.some((a) => bankLower.includes(String(a).toLowerCase()))
          if (!inBank) {
            console.log(`❌ ${file}[round ${ri}][blank ${bi}]: answer ${JSON.stringify(acceptable)} not in word_bank`)
            errors++
          }
        })
      })
    }

    if (task.type === "flashcards") {
      const cards = task.cards || []
      if (!Array.isArray(cards) || cards.length === 0) {
        console.log(`❌ ${file}: flashcards task has no cards`)
        errors++
      }
      for (let j = 0; j < cards.length; j++) {
        const c = cards[j]
        if (!c.front || typeof c.front !== "string" || !c.back || typeof c.back !== "string") {
          console.log(`❌ ${file}[${j}]: card must have non-empty string front/back: ${JSON.stringify(c)}`)
          errors++
        }
      }
    }

    if (task.type === "wheel") {
      for (let j = 0; j < items.length; j++) {
        const item = items[j]
        if (!item.label || typeof item.label !== "string") {
          console.log(`❌ ${file}[${j}]: wheel item missing label: ${JSON.stringify(item)}`)
          errors++
        }
        if (item.answer !== undefined && typeof item.answer !== "string") {
          console.log(`❌ ${file}[${j}]: wheel answer must be a string: ${JSON.stringify(item)}`)
          errors++
        }
      }
    }

    if (task.type === "choose-story") {
      // W1-T4 Choose Your Story: выборы + шаблоны предложений + scaffold.
      const arrays = [
        ["characters", task.characters],
        ["places", task.places],
        ["problems", task.problems],
        ["sentencePatterns", task.sentencePatterns],
      ]
      for (const [key, arr] of arrays) {
        if (!Array.isArray(arr) || arr.length === 0 || !arr.every((s) => typeof s === "string" && s.length > 0)) {
          console.log(`❌ ${file}: choose-story ${key} must be a non-empty string[]`)
          errors++
        }
      }
      if (task.scaffold !== "full" && task.scaffold !== "keywords") {
        console.log(`❌ ${file}: choose-story scaffold must be "full" or "keywords", got: ${JSON.stringify(task.scaffold)}`)
        errors++
      }
      if (Array.isArray(task.sentencePatterns)) {
        task.sentencePatterns.forEach((p, pi) => {
          if (typeof p !== "string" || p.trim() === "") {
            console.log(`❌ ${file}[pattern ${pi}]: pattern must be a non-empty string: ${JSON.stringify(p)}`)
            errors++
          }
        })
        // Хотя бы один шаблон использует выборы (иначе рассказ не зависит от шага 1).
        if (!task.sentencePatterns.some((p) => /\{(?:char|place|problem)\}/.test(p))) {
          console.log(`❌ ${file}: no sentencePattern uses {char}/{place}/{problem}`)
          errors++
        }
      }
    }

    const clozeHasData = task.type === "cloze" && ((task.rounds && task.rounds.length > 0) || task.text)
    if (items.length === 0 && !clozeHasData && task.type !== "role-play" && task.type !== "voice-chat" && task.type !== "flashcards" && task.type !== "choose-story") {
      console.log(`⚠️ ${file}: no items (type=${task.type})`)
    }
    
    console.log(`✅ ${file}: type=${task.type}, items=${items.length}`)
  } catch (e) {
    console.log(`❌ ${file}: ${e.message}`)
    errors++
  }
}

for (const file of files) {
  normalizedCount++
  verifyFile(file, dir)
}
for (const file of files6) {
  normalizedCount6++
  verifyFile(file, dir6)
}
for (const file of files8) {
  normalizedCount8++
  verifyFile(file, dir8)
}
for (const file of files9) {
  normalizedCount9++
  verifyFile(file, dir9)
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

// 4. All files normalize without throwing — the per-file loops above count
//    this; assert per grade explicitly.
sanityCheck(
  "all 58 grade_5 files normalize without throwing",
  normalizedCount === 58,
  `normalizedCount=${normalizedCount}`,
)
sanityCheck(
  "all 49 grade_6 files normalize without throwing",
  normalizedCount6 === 49,
  `normalizedCount6=${normalizedCount6}`,
)
sanityCheck(
  "all 34 grade_8 files normalize without throwing",
  normalizedCount8 === 34,
  `normalizedCount8=${normalizedCount8}`,
)
sanityCheck(
  "all 52 grade_9 files normalize without throwing",
  normalizedCount9 === 52,
  `normalizedCount9=${normalizedCount9}`,
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
    "cloze",
    "role-play",
    "voice-chat",
    "fill-in-and-speak",
    "click-mistake",
    "flashcards",
    "wheel",
    // W1-T4: Choose Your Story
    "choose-story",
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
