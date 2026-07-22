/**
 * Normalizes raw JSON data to match component contracts.
 * SINGLE SOURCE OF TRUTH — both page.tsx and verify-content.mjs import this.
 */
export function normalize(raw) {
  // grammar_endings_quiz: groups → flat items
  if (raw.groups && Array.isArray(raw.groups)) {
    raw.items = raw.groups.flatMap((g) => g.items ?? [])
    delete raw.groups
  }

  // story_harry_potter_routine: story → items, text → sentence
  if (raw.story && Array.isArray(raw.story)) {
    raw.items = raw.story
      .filter((s) => s.blank !== null && s.verb)
      .map((s) => ({ sentence: s.text, answer: s.answer, hint: s.verb }))
    delete raw.story
  }

  // speaking_about_yourself: prompts → questions in sections
  if (raw.sections && Array.isArray(raw.sections)) {
    raw.sections = raw.sections.map((s) => ({
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
    raw.items = raw.items.map((i) => ({
      sentence: i.full.replace(new RegExp(`\\b${i.adverb.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`), "___"),
      answer: i.adverb,
    }))
    raw.type = "fill-in"
  }

  // grammar_wh_questions: statement → sentence with ___ blank
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
          if (/^(elephant|lion|crocodile|goose|goldfish|tortoise|spider|butterfly|giraffe|rhino|camels|penguins|zebras)$/i.test(verb)) {
            return match
          }
          return verb
        })
      }
      body = body.replace(/^([A-Z])/, (c) => c.toLowerCase())
      return {
        sentence: `___ ${body}?`,
        answer: prefix,
        hint: i.hint,
      }
    })
  }

  // grammar_yes_no_questions: statement/question → quiz with options
  if (raw.items?.[0]?.statement && raw.items[0].question && !raw.items[0].options) {
    raw.items = raw.items.map((i) => {
      const q = i.question
      const s = i.statement
      const isDo = q.startsWith("Do ")
      const wrongAux = isDo
        ? q.replace(/^Do\b/, "Does")
        : q.replace(/^Does\b/, "Do")

      // Find verb in statement
      const sParts = s.replace(/\.$/, "").split(/\s+/)
      const stopwords = /^(The|A|An|I|you|he|she|it|we|they|my|your|his|her|its|our|their|and|or|in|on|at|with|to|from)$/i
      const commonVerbs = /^(eat|drink|play|watch|sleep|cook|see|fly|go|stay|run|read|tell|jump|walk|swim|live|work|wait|have|make|speak|sit|stand|give|take|come|like|love|want|need|use|open|close|start|stop|look|listen|ask|answer|help|try|finish)$/i
      let verbStatement = ""
      // First pass: find common verb
      for (let w = 1; w < sParts.length; w++) {
        if (stopwords.test(sParts[w])) continue
        if (commonVerbs.test(sParts[w])) {
          verbStatement = sParts[w]
          break
        }
      }
      // Second pass: if no common verb found, look for word ending in -s
      if (!verbStatement) {
        for (let w = 1; w < sParts.length; w++) {
          if (stopwords.test(sParts[w])) continue
          if (sParts[w].match(/s$/i)) {
            verbStatement = sParts[w]
            break
          }
        }
      }

      // Get base form
      let verbBase = ""
      if (verbStatement) {
        verbBase = verbStatement
          .replace(/(?:sh|ch|x|z|s)es$/, "")
          .replace(/ies$/, "y")
          .replace(/s$/, "")
        if (verbBase === verbStatement && verbStatement.endsWith("ves")) {
          verbBase = verbStatement.slice(0, -3) + "f"
        }
      }

      // Create wrongVerb: if statement has -s, use it; otherwise add -s
      let wrongVerb = q
      if (verbBase) {
        const sForm = verbBase.endsWith("y")
          ? verbBase.slice(0, -1) + "ies"
          : verbBase + "s"
        // If verb already has -s in statement, use that form
        // Otherwise, add -s to the base form
        const formToUse = verbStatement.endsWith("s") ? verbStatement : sForm
        wrongVerb = q.replace(new RegExp(`\\b${verbBase}\\b`), formToUse)
      }

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
