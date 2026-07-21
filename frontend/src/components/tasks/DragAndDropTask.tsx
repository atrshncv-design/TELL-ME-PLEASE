"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"

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
  onComplete?: (score: number) => void
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
  const [dragging, setDragging] = useState<DragItem | null>(null)
  const [checked, setChecked] = useState(false)

  const handleDragStart = (item: DragItem) => setDragging(item)

  const handleDrop = (colId: string) => {
    if (!dragging) return
    setPool((p) => p.filter((i) => i.verb !== dragging.verb))
    setPlaced((prev) => ({ ...prev, [colId]: [...prev[colId], dragging] }))
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
    setChecked(true)
    let score = 0
    columns.forEach((col) => {
      placed[col.id].forEach((item) => {
        if (item.answer === col.id) score++
      })
    })
    onComplete?.(score)
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-indigo-900">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>

      {/* Pool */}
      <div className="flex flex-wrap gap-2 min-h-[60px] p-3 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
        <AnimatePresence>
          {pool.map((item) => (
            <motion.div
              key={item.verb}
              layout
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              draggable
              onDragStart={() => handleDragStart(item)}
              onDragEnd={() => setDragging(null)}
              className="px-3 py-2 bg-white rounded-lg border border-indigo-200 cursor-grab active:cursor-grabbing text-sm font-medium shadow-sm hover:shadow-md select-none"
            >
              {item.verb}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-3 gap-3">
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

      {!checked && pool.length === 0 && (
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
