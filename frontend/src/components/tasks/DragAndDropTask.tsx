"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSound } from "@/lib/useSound"
import { ResultScreen } from "@/components/ResultScreen"

interface Column {
  id: string
  label: string
  rule?: string
}

interface DragItem {
  verb: string
  answer: string
}

interface DragAndDropTaskProps {
  title: string
  description: string
  columns: Column[]
  items: DragItem[]
  onComplete?: (score: number, total: number) => void
}

export function DragAndDropTask({
  title,
  description,
  columns,
  items,
  onComplete,
}: DragAndDropTaskProps) {
  const [pool, setPool] = useState<DragItem[]>(() => [...items].sort(() => Math.random() - 0.5))
  const [placed, setPlaced] = useState<Record<string, DragItem[]>>(() =>
    Object.fromEntries(columns.map((c) => [c.id, []]))
  )
  // from: null = чип из пула, иначе id столбика, из которого тащат.
  const [dragging, setDragging] = useState<{ item: DragItem; from: string | null } | null>(null)
  const [checked, setChecked] = useState(false)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const { play } = useSound()

  const handleDragStart = (item: DragItem, from: string | null) => {
    if (checked) return
    setDragging({ item, from })
  }

  // Убирает чип из пула И из всех столбиков — так drag поддерживает перенос
  // между столбиками и возврат в пул (аддитивно, старые задания не ломаются).
  const removeEverywhere = (verb: string) => {
    setPool((p) => p.filter((i) => i.verb !== verb))
    setPlaced((prev) => {
      const next = { ...prev }
      for (const c of columns) {
        next[c.id] = next[c.id].filter((i) => i.verb !== verb)
      }
      return next
    })
  }

  const handleDrop = (colId: string) => {
    if (!dragging) return
    const { item } = dragging
    removeEverywhere(item.verb)
    setPlaced((prev) => ({ ...prev, [colId]: [...prev[colId], item] }))
    setDragging(null)
  }

  const handleDropToPool = () => {
    if (!dragging) return
    const { item } = dragging
    removeEverywhere(item.verb)
    setPool((p) => [...p, item])
    setDragging(null)
  }

  const handleReturn = (colId: string, idx: number) => {
    if (checked) return
    const item = placed[colId][idx]
    setPlaced((prev) => ({
      ...prev,
      [colId]: prev[colId].filter((_, i) => i !== idx),
    }))
    setPool((p) => [...p, item])
  }

  const checkAnswers = () => {
    if (checked) return
    setChecked(true)
    let score = 0
    columns.forEach((col) => {
      placed[col.id].forEach((item) => {
        if (item.answer === col.id) score++
      })
    })
    setScore(score)
    // One-shot task: the check IS the finish — fanfare on perfect, else wrong.
    play(score === items.length ? "fanfare" : "wrong")
    // Короткая пауза, чтобы показать зелёные/красные рамки, затем ResultScreen.
    setTimeout(() => {
      setFinished(true)
      onComplete?.(score, items.length)
    }, 1200)
  }

  const retry = () => {
    setPool([...items].sort(() => Math.random() - 0.5))
    setPlaced(Object.fromEntries(columns.map((c) => [c.id, []])))
    setDragging(null)
    setChecked(false)
    setScore(0)
    setFinished(false)
  }

  if (finished) {
    return <ResultScreen title={title} score={score} total={items.length} onRetry={retry} />
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-indigo-900">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>

      {/* Pool (сюда можно вернуть чип из столбика) */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDropToPool}
        className="flex flex-wrap gap-2 min-h-[60px] p-3 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200"
      >
        <AnimatePresence>
          {pool.map((item) => (
            <motion.div
              key={item.verb}
              layout
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              draggable={!checked}
              onDragStart={() => handleDragStart(item, null)}
              onDragEnd={() => setDragging(null)}
              className="px-3 py-2 bg-white rounded-lg border border-indigo-200 cursor-grab active:cursor-grabbing text-sm font-medium shadow-sm hover:shadow-md select-none"
            >
              {item.verb}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {columns.map((col) => (
          <div
            key={col.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(col.id)}
            className="flex flex-col gap-2 p-3 bg-white rounded-xl border-2 border-indigo-100 min-h-[120px]"
          >
            <div className="text-center font-bold text-indigo-700 text-sm">{col.label}</div>
            {col.rule && <div className="text-xs text-slate-400 text-center">{col.rule}</div>}
            <div className="flex flex-wrap gap-1">
              <AnimatePresence>
                {placed[col.id].map((item, idx) => {
                  let border = "border-slate-200"
                  if (checked) {
                    border = item.answer === col.id ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
                  }
                  return (
                    <motion.div
                      key={item.verb}
                      layout
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      draggable={!checked}
                      onDragStart={() => handleDragStart(item, col.id)}
                      onDragEnd={() => setDragging(null)}
                      onClick={() => handleReturn(col.id, idx)}
                      className={`px-2 py-1 rounded text-xs font-medium border cursor-pointer ${border}`}
                    >
                      {item.verb}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* «Проверить» доступна в ЛЮБОЙ момент (не только когда пул пуст):
          проверяются размещённые чипы, неразмещённые — мимо. */}
      {!checked && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={checkAnswers}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700"
        >
          Проверить
        </motion.button>
      )}

      {checked && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-lg font-semibold text-indigo-800"
        >
          Правильных: {Object.values(placed).flat().filter((i) => {
            const col = columns.find((c) => placed[c.id].includes(i))
            return col && i.answer === col.id
          }).length} / {items.length}
        </motion.div>
      )}
    </div>
  )
}
