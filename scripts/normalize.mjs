/**
 * Harness-facing re-export of the canonical normalize implementation.
 *
 * The SINGLE SOURCE OF TRUTH is `frontend/src/lib/normalize.mjs` (plain ESM).
 * This wrapper exists so `scripts/verify-content.mjs` can keep its short
 * `import { normalize } from "./normalize.mjs"` form while still executing the
 * SAME logic as the Next.js runtime (which imports it via
 * frontend/src/lib/normalize-task.ts).
 *
 * Do NOT add normalization logic here — edit the canonical file.
 */
import { normalize } from "../frontend/src/lib/normalize.mjs"

export { normalize }
