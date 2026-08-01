import { useMemo } from "react"

/**
 * CSS-only confetti — zero dependencies. Renders N absolutely positioned
 * pieces that fall & spin via the `confetti-fall` keyframes in globals.css.
 *
 * Values are generated with a tiny seeded PRNG (deterministic per index) so
 * the server render and the client hydration produce identical DOM — no
 * hydration mismatch. Colors come from the Bright Kids Palette.
 */
const CONFETTI_COLORS = ["#6366f1", "#14b8a6", "#10b981", "#f59e0b", "#f43f5e", "#4f46e5"]

/** Deterministic pseudo-random in [0, 1) from an integer seed. */
function seeded(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

interface Piece {
  left: number
  w: number
  h: number
  color: string
  dur: number
  delay: number
  rot: number
  drift: number
}

export function Confetti({ count = 28 }: { count?: number }) {
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: seeded(i, 1) * 100,
        w: 6 + seeded(i, 2) * 6,
        h: 8 + seeded(i, 3) * 8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        dur: 2.6 + seeded(i, 4) * 1.8,
        delay: seeded(i, 5) * 1.4,
        rot: 360 + seeded(i, 6) * 540,
        drift: (seeded(i, 7) - 0.5) * 140,
      })),
    [count]
  )

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.h,
            background: p.color,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
            ["--cf-rot" as string]: `${p.rot}deg`,
            ["--cf-x" as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  )
}
