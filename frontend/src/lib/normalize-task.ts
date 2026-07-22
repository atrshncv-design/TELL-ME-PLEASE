/**
 * Normalizes raw JSON data to match component contracts.
 * Handles field renames, structural flattening, and type coercion
 * for legacy JSON files that predate the unified schema.
 *
 * This is the SINGLE SOURCE OF TRUTH for task normalization.
 * Both page.tsx and scripts/verify-content.mjs must use this function.
 */
export function normalize(raw: Record<string, any>): Record<string, any> {
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

  // grammar_adverbs_place: use full field to build sentence with blank
  if (raw.items?.[0]?.sentence_base) {
    const adverbs = raw.available_adverbs || []
    if (adverbs.length > 0) {
      raw.description = `${raw.description}\n\nНаречия: ${adverbs.join(", ")}`
    }
    raw.items = raw.items.map((i: any) => ({
      sentence: i.full.replace(new RegExp(`\\b${i.adverb.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`), "___"),
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
      if (!prefix) {
        const wordMatch = answer.match(/^(What|Where|When|How|Why|Who|Which)\s/i)
        prefix = wordMatch ? wordMatch[0].trim() : ""
      }
      // For does-items: remove -s from verb
      let body = statement.replace(/\.$/, "")
      if (prefix.includes("does")) {
        body = body.replace(/\b(\w+)(s|es)\b/, (match: string, verb: string, suffix: string) => {
          if (/^(elephant|lion|crocodile|goose|goldfish|tortoise|spider|butterfly|giraffe|rhino|camels|penguins|zebras)$/i.test(verb)) {
            return match
          }
          return verb
        })
      }
      // Lowercase the subject after auxiliary for all wh-questions
      body = body.replace(/^([A-Z])/, (c: string) => c.toLowerCase())
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

      // Find verb by diffing statement vs question
      // Remove auxiliary and subject from both, what's left is the verb
      const qNoAux = q.replace(/^(Do|Does)\s+/i, "").toLowerCase()
      const sLower = s.replace(/\.$/, "").toLowerCase()
      // Find the first word in question that differs from statement
      const qWords = qNoAux.split(/\s+/)
      const sWords = sLower.split(/\s+/)
      let verbBase = ""
      let verbS = ""
      for (let w = 0; w < Math.min(qWords.length, sWords.length); w++) {
        if (qWords[w] !== sWords[w]) {
          // Found the verb difference
          verbBase = qWords[w]
          verbS = sWords[w]
          break
        }
      }

      // Create wrongVerb: add -s to the base verb
      let wrongVerb = q
      if (verbBase && verbBase !== verbS) {
        // Use the -s form from statement in the question
        wrongVerb = q.replace(new RegExp(`\\b${verbBase}\\b`, "i"), verbS)
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

  return raw
}
