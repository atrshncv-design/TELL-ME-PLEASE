"use client"

import { AnimatePresence, motion } from "framer-motion"
import { presentSimpleRules } from "@/lib/presentSimpleRules"

interface RulesPanelProps {
  open: boolean
  onClose: () => void
}

/**
 * Модальная панель-шпаргалка «Правила: Present Simple» (тикет P6).
 * Контент — из `@/lib/presentSimpleRules` (разделы 1–8 + 10 справочника).
 * Строки, обёрнутые в *звёздочки*, — английские примеры, рендерятся курсивом.
 */
export function RulesPanel({ open, onClose }: RulesPanelProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 48, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 48, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
          >
            {/* Шапка панели */}
            <div className="flex items-center justify-between gap-2 border-b border-indigo-100 bg-gradient-to-r from-indigo-50 via-sky-50 to-amber-50 px-5 py-4">
              <h2 className="font-display text-lg font-extrabold tracking-tight text-indigo-900">
                📖 Правила: Present Simple
              </h2>
              <button
                onClick={onClose}
                aria-label="Закрыть правила"
                className="flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-white text-indigo-700 shadow-sm transition-colors hover:bg-indigo-100"
              >
                ✕
              </button>
            </div>

            {/* Прокручиваемый контент */}
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              {presentSimpleRules.map((section) => (
                <section key={section.title}>
                  <h3 className="mb-2 text-sm font-bold text-indigo-800">{section.title}</h3>
                  <ul className="space-y-1.5">
                    {section.items.map((item, i) => {
                      // Строка целиком — пример (начинается и заканчивается *…*)
                      const isExampleLine = item.startsWith("*") && item.endsWith("*")
                      // Сегменты: обычный текст и *примеры* (курсив) чередуются
                      const segments = item.split(/\*([^*]+)\*/g)
                      return (
                        <li
                          key={i}
                          className={`text-sm leading-relaxed ${isExampleLine ? "italic text-indigo-700" : "text-slate-700"}`}
                        >
                          <span className="mr-1">{isExampleLine ? "→" : "•"}</span>
                          {segments.map((seg, si) =>
                            si % 2 === 1 ? (
                              <span key={si} className="italic text-indigo-700">
                                {seg}
                              </span>
                            ) : (
                              seg
                            ),
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </div>

            {/* Кнопка закрытия */}
            <div className="border-t border-indigo-100 px-5 py-3">
              <button
                onClick={onClose}
                className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                Понятно! ✨
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
