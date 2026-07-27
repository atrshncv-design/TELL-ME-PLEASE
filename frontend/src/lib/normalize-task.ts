/**
 * Typed re-export of the canonical normalize implementation.
 *
 * The SINGLE SOURCE OF TRUTH is `frontend/src/lib/normalize.mjs` (plain ESM,
 * no React/Next deps) so that `scripts/verify-content.mjs` (via
 * scripts/normalize.mjs) and the Next.js runtime run the EXACT SAME logic.
 *
 * This file only re-exports it with a typed signature for the frontend.
 * Do NOT duplicate normalization logic here — edit normalize.mjs.
 */
import { normalize as normalizeImpl } from "./normalize.mjs"

type Raw = Record<string, any>

/** Normalize raw task JSON to match component contracts. Delegates to the canonical .mjs. */
export function normalize(raw: Raw): Raw {
  return normalizeImpl(raw) as Raw
}
