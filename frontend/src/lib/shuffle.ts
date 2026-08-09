/**
 * Детерминированный шаффл (тикет W1-T01, G1 — «Правки клиентки 08.08.2026»).
 *
 * Клиентка: «всегда правильный первый / верхний левый» — варианты quiz нужно
 * перемешивать. Шаффл ОБЯЗАН быть детерминированным (seed, НЕ Math.random):
 * SSR и клиентская гидратация рендерят одни и те же порядки — иначе
 * hydration mismatch. Seed строится из id/текста задания + номера вопроса,
 * чтобы позиция правильного ответа менялась между вопросами.
 */

/** FNV-1a хэш строки → uint32 (детерминированный seed из любого текста). */
export function hashString(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32 — быстрый детерминированный PRNG (uint32 seed → [0, 1)). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher–Yates с детерминированным PRNG: для одного seed порядок всегда один. */
export function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
  const copy = arr.slice()
  const rand = mulberry32(seed)
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy
}
