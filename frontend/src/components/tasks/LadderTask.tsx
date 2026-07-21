"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface LadderData {
  id: string
  direction: "up" | "down"
  title: string
  steps: string[]
}

interface LadderTaskProps {
  title: string
  description: string
  ladders: LadderData[]
}

export function LadderTask({ title, description, ladders }: LadderTaskProps) {
  const [activeLadder, setActiveLadder] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const ladder = ladders[activeLadder]

  const stepIdx =
    ladder.direction === "up" ? currentStep : ladder.steps.length - 1 - currentStep

  const handleNext = () => {
    if (currentStep < ladder.steps.length - 1) {
      setCurrentStep((s) => s + 1)
    } else if (activeLadder < ladders.length - 1) {
      setActiveLadder((a) => a + 1)
      setCurrentStep(0)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1)
    } else if (activeLadder > 0) {
      setActiveLadder((a) => a - 1)
      setCurrentStep(ladders[activeLadder - 1].steps.length - 1)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-indigo-900">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>

      {/* Ladder tabs */}
      <div className="flex gap-2">
        {ladders.map((l, i) => (
          <button
            key={l.id}
            onClick={() => { setActiveLadder(i); setCurrentStep(0) }}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
              i === activeLadder
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {l.title}
          </button>
        ))}
      </div>

      {/* Ladder visualization */}
      <div className="flex flex-col-reverse gap-1 items-center">
        {ladder.steps.map((step, i) => {
          const isActive = i === stepIdx
          const isPast =
            ladder.direction === "up" ? i < stepIdx : i > stepIdx

          return (
            <motion.div
              key={i}
              layout
              onClick={() => setCurrentStep(i)}
              className={`w-full max-w-md px-4 py-2 rounded-lg cursor-pointer text-sm transition-all border-2 ${
                isActive
                  ? "bg-indigo-100 border-indigo-500 text-indigo-900 font-semibold"
                  : isPast
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-white border-slate-200 text-slate-600"
              }`}
            >
              {step}
            </motion.div>
          )
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={handlePrev}
          disabled={activeLadder === 0 && currentStep === 0}
          className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-medium disabled:opacity-40"
        >
          ← Назад
        </button>
        <button
          onClick={handleNext}
          disabled={activeLadder === ladders.length - 1 && currentStep === ladder.steps.length - 1}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium disabled:opacity-40"
        >
          Далее →
        </button>
      </div>
    </div>
  )
}
