"use client"

import { useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSound } from "@/lib/useSound"

interface WheelItem {
  label: string
  answer?: string
}

interface WheelTaskProps {
  title: string
  description: string
  items: WheelItem[]
}

/**
 * «Колесо удачи» (P3): SVG-спиннер с секторами. Ученик крутит колесо,
 * выпадает слово/подлежащее — нужно назвать форму глагола to be.
 * Самопроверка по кнопке «Показать ответ» (answer опционален).
 *
 * Геометрия: сектор i занимает [i*sa, (i+1)*sa) градусов по часовой
 * стрелке от верха (12 часов). Колесо вращается на угол `rotation`
 * (положительный = по часовой). Указатель закреплён сверху; после
 * остановки центр выпавшего сектора оказывается ровно под ним.
 */

// Чередующаяся палитра секторов — цвета платформы (Bright Kids Palette).
const SECTOR_COLORS = [
  "#6366f1", // primary-500 (индиго)
  "#14b8a6", // tobe-500 (бирюза)
  "#f59e0b", // listening-500 (янтарь)
  "#f43f5e", // speaking-500 (роза)
  "#10b981", // vocabulary-500 (изумруд)
  "#818cf8", // primary-400 (светлое индиго)
]

const SIZE = 320
const CX = SIZE / 2
const CY = SIZE / 2
const RADIUS = 150
const HUB_RADIUS = 30

/** Точка на окружности: угол в градусах (0 = верх, по часовой). */
function polar(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) }
}

/** SVG-путь сектора от start до end градусов (по часовой стрелке от верха). */
function sectorPath(start: number, end: number, radius = RADIUS): string {
  const s = polar(start, radius)
  const e = polar(end, radius)
  const largeArc = end - start > 180 ? 1 : 0
  return `M ${CX} ${CY} L ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z`
}

/** Размер шрифта подписи по длине слова (длинные — мельче, чтобы влезали). */
function labelFontSize(label: string): number {
  const len = label.length
  if (len <= 3) return 16
  if (len <= 7) return 13
  if (len <= 10) return 11
  return 10
}

export function WheelTask({ title, description, items }: WheelTaskProps) {
  const { play } = useSound()

  // Накопленный угол вращения колеса (всегда растёт, чтобы крутить вперёд).
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  // Индекс выпавшего сектора — фиксируется в МОМЕНТ ОСТАНОВКИ (onAnimationComplete),
  // а не в момент запуска: если анимация не доехала, карточка не появится раньше времени.
  const [winner, setWinner] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [spins, setSpins] = useState(0)
  // Целевой сектор, запомненный в момент запуска вращения (для onAnimationComplete).
  const targetRef = useRef<number | null>(null)
  // Fallback-таймер на случай, если onAnimationComplete не сработает.
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const n = items.length
  const sectorAngle = n > 0 ? 360 / n : 360

  // Геометрия секторов и подписей (пересчитывается при смене контента).
  const sectors = useMemo(() => {
    return items.map((item, i) => {
      const start = i * sectorAngle
      const mid = start + sectorAngle / 2
      const pos = polar(mid, RADIUS * 0.58)
      // Угол поворота подписи, чтобы текст читался наружу от центра.
      // Для секторов левой половины переворачиваем на 180°, иначе буквы
      // были бы «вверх ногами».
      let rot = (mid - 90 + 360) % 360
      if (rot > 90 && rot < 270) rot += 180
      return {
        item,
        color: SECTOR_COLORS[i % SECTOR_COLORS.length],
        path: sectorPath(start, start + sectorAngle),
        labelX: pos.x,
        labelY: pos.y,
        labelRot: rot,
        fontSize: labelFontSize(item.label),
      }
    })
  }, [items, sectorAngle])

  // Запуск вращения: случайный сектор + случайное число оборотов.
  // Целевой угол подбирается так, чтобы центр сектора winner оказался
  // под указателем (0° = верх), плюс 5–7 полных оборотов для эффекта.
  const spin = () => {
    if (spinning || n === 0) return
    const i = Math.floor(Math.random() * n)
    const targetMod = (360 - ((i * sectorAngle + sectorAngle / 2) % 360)) % 360
    const turns = 5 + Math.floor(Math.random() * 3)
    const currentMod = ((rotation % 360) + 360) % 360
    const next = rotation + turns * 360 + ((targetMod - currentMod + 360) % 360)
    targetRef.current = i
    setShowAnswer(false)
    setSpinning(true)
    setRotation(next)
    // Fallback: если onAnimationComplete не сработает (редкие браузеры),
    // показываем результат по таймеру чуть больше длительности анимации.
    if (fallbackRef.current) clearTimeout(fallbackRef.current)
    fallbackRef.current = setTimeout(() => {
      if (targetRef.current !== null) {
        setWinner(targetRef.current)
        setSpinning(false)
        setSpins((s) => s + 1)
        targetRef.current = null
      }
    }, 4300)
  }

  // Момент остановки: снимаем блокировку, фиксируем выпавший сектор, считаем прокрутку.
  // framer-motion вызывает onAnimationComplete и при монтировании (initial-проход) —
  // игнорируем такие вызовы: без запущенного вращения (targetRef === null) не считаем.
  const handleSpinComplete = () => {
    if (fallbackRef.current) clearTimeout(fallbackRef.current)
    if (targetRef.current === null) return
    setWinner(targetRef.current)
    targetRef.current = null
    setSpinning(false)
    setSpins((s) => s + 1)
    play("fanfare")
  }

  if (n === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <p className="text-slate-500">Нет данных для отображения</p>
      </div>
    )
  }

  const landed = winner !== null && !spinning
  const winnerItem = landed && winner !== null ? items[winner] : null

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-primary-900">
        {title}
      </h2>
      <p className="text-sm text-slate-500">{description}</p>

      {/* ==== Колесо ==== */}
      <div className="relative mx-auto w-full max-w-[340px] select-none">
        {/* Вращающаяся часть: HTML-обёртка. CSS transform на HTML-элементе
            работает во всех браузерах (на SVG <g> framer-motion его «теряет»). */}
        <motion.div
          animate={{ rotate: rotation }}
          transition={{ duration: 3.8, ease: [0.12, 0.8, 0.1, 1] }}
          onAnimationComplete={handleSpinComplete}
          style={{ width: "100%" }}
        >
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-auto drop-shadow-soft">
            {sectors.map((s, i) => (
              <g key={i}>
                <path d={s.path} fill={s.color} stroke="#ffffff" strokeWidth={1.5} />
                <text
                  x={s.labelX}
                  y={s.labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${s.labelRot} ${s.labelX} ${s.labelY})`}
                  fontSize={s.fontSize}
                  fontWeight={700}
                  fill="#1e293b"
                  stroke="rgba(255,255,255,0.85)"
                  strokeWidth={3}
                  paintOrder="stroke"
                  style={{ fontFamily: "inherit" }}
                >
                  {s.item.label}
                </text>
              </g>
            ))}
            {/* Хаб в центре */}
            <circle cx={CX} cy={CY} r={HUB_RADIUS} fill="#ffffff" stroke="#e2e8f0" strokeWidth={2} />
            <text x={CX} y={CY + 8} textAnchor="middle" fontSize={26}>
              🎯
            </text>
          </svg>
        </motion.div>

        {/* Невращающийся слой: подсветка выпавшего сектора + указатель.
            Стоит на месте, поэтому точно закрывает сектор-победитель,
            чей центр после остановки находится под указателем. */}
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="pointer-events-none absolute inset-0 w-full h-auto"
        >
          <AnimatePresence>
            {landed && (
              <motion.path
                key="winner-highlight"
                d={sectorPath(-sectorAngle / 2, sectorAngle / 2)}
                fill="rgba(255,255,255,0.25)"
                stroke="#fbbf24"
                strokeWidth={4}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                style={{ originX: CX, originY: CY }}
              />
            )}
          </AnimatePresence>

          {/* Указатель сверху (не вращается) */}
          <path
            d={`M ${CX - 13} 6 L ${CX + 13} 6 L ${CX} 26 Z`}
            fill="#dc2626"
            stroke="#ffffff"
            strokeWidth={2}
          />
        </svg>
      </div>

      {/* ==== Карточка результата ==== */}
      <div className="min-h-[92px]">
        <AnimatePresence mode="wait">
          {spinning && (
            <motion.div
              key="spinning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 py-6 text-slate-500"
            >
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="inline-block text-2xl"
              >
                🎡
              </motion.span>
              <span className="font-semibold">Колесо крутится…</span>
            </motion.div>
          )}

          {landed && winnerItem && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border-2 border-amber-300 bg-white p-4 text-center shadow-soft"
            >
              <p className="text-lg font-bold text-slate-800">
                🎯 Выпало: <span className="text-primary-700">{winnerItem.label}</span>
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Назови форму глагола to be!
              </p>

              {winnerItem.answer ? (
                <div className="mt-3">
                  {showAnswer ? (
                    <motion.p
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 16 }}
                      className="inline-block rounded-full bg-success px-6 py-2 text-2xl font-black text-white"
                    >
                      {winnerItem.answer}
                    </motion.p>
                  ) : (
                    <button
                      onClick={() => setShowAnswer(true)}
                      className="min-h-[44px] rounded-full bg-primary-100 px-5 py-2 text-sm font-bold text-primary-700 transition-colors hover:bg-primary-200"
                    >
                      👀 Показать ответ
                    </button>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm font-semibold text-success">
                  Проверь себя сам(а) — ответа нет!
                </p>
              )}
            </motion.div>
          )}

          {winner === null && !spinning && (
            <motion.div
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-6 text-center text-sm text-slate-400"
            >
              Нажми «Крутить», чтобы узнать слово
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ==== Кнопка + счётчик ==== */}
      <div className="flex flex-col items-center gap-3">
        <motion.button
          onClick={spin}
          disabled={spinning}
          whileTap={{ scale: 0.95 }}
          className="min-h-[56px] w-full max-w-xs rounded-2xl bg-gradient-to-r from-primary-500 to-grammar-400 px-6 text-lg font-extrabold text-white shadow-glow-primary transition-opacity disabled:opacity-60"
        >
          {landed ? "🔄 Ещё раз" : "🎡 Крутить"}
        </motion.button>
        <div className="flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-slate-500 shadow-soft">
          <span>Прокруток:</span>
          <span className="text-primary-700">{spins}</span>
        </div>
      </div>
    </div>
  )
}
