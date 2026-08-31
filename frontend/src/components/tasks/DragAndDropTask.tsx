"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSound } from "@/lib/useSound"
import { useSpeechSynthesis } from "@/lib/useSpeechSynthesis"
import { useServerTts } from "@/lib/useServerTts"
import { ResultScreen } from "@/components/ResultScreen"

interface Column {
  id: string
  label: string
  rule?: string
}

interface DragItem {
  id?: string
  verb: string
  answer: string
  form2?: string
  form3?: string
}

function getItemId(item: DragItem): string {
  return item.id ?? item.verb
}

interface DragAndDropTaskProps {
  title: string
  description: string
  columns: Column[]
  items: DragItem[]
  /**
   * W3-T03 (client-fixes-0808): review: true — после «Проверить» НЕ завершать
   * упражнение автоматически. Остаёмся на экране разбора ошибок (верные
   * зелёные, ошибочные красные) и ждём кнопку «Далее» → ResultScreen.
   * Без флага (undefined/false) — прежнее поведение: авто-финиш через 1.2 с.
   */
  review?: boolean
  /** Check each drop immediately; omitted keeps the legacy Check flow. */
  instantCheck?: boolean
  onComplete?: (score: number, total: number) => void
}

export function DragAndDropTask({
  title,
  description,
  columns,
  items,
  instantCheck,
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
  const [instantVerdicts, setInstantVerdicts] = useState<Record<string, boolean>>({})
  const { play } = useSound()
  const { speak, supported } = useSpeechSynthesis()
  const serverTts = useServerTts()
  const hasWordAudio = description.includes("🔊")

  const handleDragStart = (item: DragItem, from: string | null) => {
    if (checked) return
    setDragging({ item, from })
  }

  const handleTap = (item: DragItem, from: string | null) => {
    if (checked) return
    // tap-to-move для телефонов: повторный тап снимает выбор — сравнение по id (или verb fallback)
    if (dragging && getItemId(dragging.item) === getItemId(item)) setDragging(null)
    else setDragging({ item, from })
  }

  // Убирает чип из пула И из всех столбиков — так drag поддерживает перенос
  // между столбиками и возврат в пул (аддитивно, старые задания не ломаются).
  const removeEverywhere = (id: string) => {
    setPool((p) => p.filter((i) => getItemId(i) !== id))
    setPlaced((prev) => {
      const next = { ...prev }
      for (const c of columns) {
        next[c.id] = next[c.id].filter((i) => getItemId(i) !== id)
      }
      return next
    })
  }

  const handleDrop = (colId: string) => {
    if (!dragging) return
    const { item } = dragging
    removeEverywhere(getItemId(item))
    setPlaced((prev) => ({ ...prev, [colId]: [...prev[colId], item] }))
    if (instantCheck) {
      const correct = item.answer === colId
      setInstantVerdicts((prev) => ({ ...prev, [getItemId(item)]: correct }))
      play(correct ? "correct" : "wrong")
    }
    setDragging(null)
  }

  const handleDropToPool = () => {
    if (!dragging) return
    const { item } = dragging
    removeEverywhere(getItemId(item))
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
    // Остаёмся на разборе ответов, пока ученик явно не нажмёт «Далее».
  }

  const retry = () => {
    setPool([...items].sort(() => Math.random() - 0.5))
    setPlaced(Object.fromEntries(columns.map((c) => [c.id, []])))
    setDragging(null)
    setChecked(false)
    setInstantVerdicts({})
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

      {/* Pool (сюда можно вернуть чип из столбика) — тап для телефонов */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDropToPool}
        onClick={() => { if (dragging) handleDropToPool() }}
        className={`flex flex-wrap gap-2 min-h-[60px] p-3 bg-slate-50 rounded-xl border-2 border-dashed ${dragging ? "border-indigo-400 bg-indigo-50/50" : "border-slate-200"} touch-manipulation`}
      >
        <AnimatePresence>
          {pool.map((item) => {
            const isSelected = dragging ? getItemId(dragging.item) === getItemId(item) && dragging.from === null : false
            return (
            <motion.div
              key={getItemId(item)}
              layout
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              draggable={!checked}
              onDragStart={() => handleDragStart(item, null)}
              onDragEnd={() => setDragging(null)}
              onClick={() => handleTap(item, null)}
              className={`px-3 py-2 bg-white rounded-lg border text-sm font-medium shadow-sm hover:shadow-md select-none cursor-grab active:cursor-grabbing touch-manipulation ${isSelected ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-300" : "border-indigo-200"}`}
            >
              <span>{item.verb}</span>
              {hasWordAudio && (
                <button
                  type="button"
                  draggable={false}
                  aria-label={`Услышать ${item.verb}`}
                  className="ml-1 cursor-pointer text-base"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (supported) speak(item.verb)
                    else serverTts.speak(item.verb)
                  }}
                >🔊</button>
              )}
            </motion.div>
            )
          })}
         </AnimatePresence>
       </div>

      {/* Tap-hint для телефонов */}
      {dragging && (
        <div className="text-center text-xs font-medium text-indigo-600 animate-pulse">
          Выбрано «{dragging.item.verb}» — нажми на колонку, чтобы переместить
        </div>
      )}

      {/* Columns — тап для телефонов */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {columns.map((col) => {
          const isTarget = !!dragging
          return (
          <div
            key={col.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(col.id)}
            onClick={() => { if (dragging) handleDrop(col.id) }}
            className={`flex flex-col gap-2 p-3 bg-white rounded-xl border-2 min-h-[120px] touch-manipulation cursor-pointer ${isTarget ? "border-indigo-300 bg-indigo-50/30" : "border-indigo-100"}`}
          >
            <div className="text-center font-bold text-indigo-700 text-sm">{col.label}</div>
            {col.rule && <div className="text-xs text-slate-400 text-center">{col.rule}</div>}
            <div className="flex flex-wrap gap-1">
              <AnimatePresence>
                {placed[col.id].map((item, idx) => {
                  let border = "border-slate-200"
                  if (checked || instantCheck) {
                    const correct = instantCheck ? instantVerdicts[getItemId(item)] : item.answer === col.id
                    if (correct !== undefined) border = correct ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
                  }
                  return (
                    <motion.div
                      key={getItemId(item)}
                      layout
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      draggable={!checked}
                      onDragStart={() => handleDragStart(item, col.id)}
                      onDragEnd={() => setDragging(null)}
                      onClick={() => {
                        if (dragging && getItemId(dragging.item) !== getItemId(item)) {
                          handleDrop(col.id)
                        } else {
                          handleReturn(col.id, idx)
                        }
                      }}
                      className={`px-2 py-1 rounded text-xs font-medium border cursor-pointer select-none touch-manipulation ${border}`}
                    >
                      <span>{item.verb}</span>
                      {instantCheck && item.form2 && <span className="ml-1 text-slate-500">→ {item.form2}</span>}
                      {hasWordAudio && (
                        <button
                          type="button"
                          draggable={false}
                          aria-label={`Услышать ${item.verb}`}
                          className="ml-1 cursor-pointer text-base"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (supported) speak(item.verb)
                            else serverTts.speak(item.verb)
                          }}
                        >🔊</button>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
          )
        })}
      </div>

      {/* G3 (правки 12.08): «Проверить» в зоне видимости — sticky-бар снизу
          (жалоба «Анализ профилей»: кнопка уезжала за экран, приходилось
          мотать). Содержит вердикт + кнопку Проверить/Далее. */}
      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-1 border-t-2 border-slate-100 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        {checked && (
          <div className="mb-2 text-center text-lg font-semibold text-indigo-800">
            Правильных: {Object.values(placed).flat().filter((i) => {
              const col = columns.find((c) => placed[c.id].includes(i))
              return col && i.answer === col.id
            }).length} / {items.length}
          </div>
        )}

        {/* «Проверить» доступна в ЛЮБОЙ момент (не только когда пул пуст):
            проверяются размещённые чипы, неразмещённые — мимо. */}
        {!checked ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={checkAnswers}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700"
          >
            Проверить
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (finished) return
              setFinished(true)
              onComplete?.(score, items.length)
            }}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700"
          >
            Далее
          </motion.button>
        )}
      </div>
    </div>
  )
}
