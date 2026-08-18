"use client"

/**
 * EpochTheory (тикет W2-T16) — инструктаж эпохи в формате ПРЕЗЕНТАЦИИ
 * (пожелание клиентки: «так нагляднее для детей»).
 *
 * Вместо аккордеона теории прямо на странице — полноэкранный режим поверх
 * карты эпохи, открывается ТОЛЬКО по кнопке «▶ Смотреть инструктаж» в шапке
 * (НЕ автоматически, чтобы не мешать ходить по станциям):
 *   1) theory[]  — слайды: крупный заголовок font-display, текст, эмодзи-
 *      метафоры из doc сохранены; навигация «← Назад» / «Вперёд →»
 *      (min-h-[44px], стиль TaskHeader/primary) + точки-прогресс и счётчик
 *      «слайд N из M»; на слайдах — кнопка «🔊 Послушай!» (озвучка правила
 *      голосом Verb Bot, гибрид Web Speech + серверный /api/tts) и примеры
 *      с новой строки (G8, правки 12.08);
 *   2) theoryQuiz[] — мини-тест «Проверь себя» (выбрал → Проверить → вердикт →
 *      Далее; мгновенную проверку глобально добавит тикет T02 — сейчас QuizTask
 *      тоже на кнопке «Проверить», паттерн согласован);
 * Музыка НЕ входит в инструктаж (G10, правки 12.08): из флоу слайды→тест она
 * убрана, доступна только по кнопке «🎵 Музыка эпохи» на странице эпохи и на
 * /music. Фаза music осталась в компоненте как цель этой кнопки.
 * Закрытие — «✕» в шапке (и Escape на десктопе).
 * Контент СТРОГО из doc (пак 070826), эмодзи сохранены. Токены primary-*.
 *
 * W1-T02 (мини-пакет verb-bot-badge): титульная обложка — крупный эмодзи
 * icon эпохи (96px-плашка) + название + subtitle + кнопка «Начать →»
 * (обложка = слайд 1, теория со слайда 2; счётчик «слайд N из M» включает
 * обложку: M = slides.length + 1). На слайдах теории — крупная
 * эмодзи-метафора (первый эмодзи из theory[].title) в плашке слева от
 * заголовка (на узких экранах — над ним), из заголовка эмодзи убран.
 */
import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSpeechSynthesis } from "@/lib/useSpeechSynthesis"
import { useServerTts } from "@/lib/useServerTts"

interface TheoryStep {
  title: string
  text: string
}

interface TheoryQuizItem {
  question: string
  options: string[]
  answer: string
}

interface EpochMusic {
  title: string
  links: string[]
  sunoPrompt: string
}

type Phase = "slides" | "quiz" | "music"

/** Первый эмодзи строки (с VS16/ZWJ-хвостами) или null, если эмодзи нет. */
function firstEmoji(s: string): string | null {
  const m = s.match(
    /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/u
  )
  return m ? m[0] : null
}

/** G8 (правки 12.08) + T02 (правки 13–14.08): предложения-примеры в тексте
 *  теории — с новой строки. Контент НЕ трогаем (зона T02–T05) — это
 *  рендер-трансформация: каждый пример (после маркеров ❌/✅ и связки ИЛИ)
 *  получает свою строку; исходные \n в тексте сохраняются
 *  (whitespace-pre-line на <p>). T02: в класс завершающих знаков добавлена
 *  скобка «)» — реальные примеры слайдов часто заканчиваются на
 *  «(…ошибка!) ✅ …» / «(Действие) ИЛИ …». */
function theoryTextToLines(text: string): string {
  return text
    .replace(/([.!?…)])\s+(?=[❌✅])/g, "$1\n")
    .replace(/([.!?…)])\s+(?=ИЛИ\s)/g, "$1\n")
}

/**
 * Проверяет, является ли строка примером (английское предложение / формула).
 *
 * Стратегия: каждая строка в theory[].text уже разделена по \n в JSON.
 * Нам нужно определить, английская это строка (пример) или русская (пояснение).
 *
 * Паттерны примеров:
 *  1) Маркеры ❌/✅ в начале
 *  2) Английское предложение: начинается с местоимения/артикля/наречия + содержит глагол
 *  3) Формула: «Подлежащее + ...»
 *  4) Короткая строка без русских букв, содержащая английские глаголы
 *
 * Паттерны НЕ-примеров (пояснения):
 *  - Начинается с русского слова / эмодзи / цифры
 *  - Содержит «:» до первого английского слова (это заголовок категории)
 *  - Смешанные строки (русский + английский в одной) — оставляем как текст
 */
function isExampleLine(line: string): boolean {
  const t = line.trim()
  if (!t) return false

  // 1) Маркеры ❌/✅
  if (/^[❌✅]/.test(t)) return true

  // 2) Формула
  if (/^Подлежащее\s/i.test(t)) return true

  // 3) Если строка содержит русские буквы ДО первого английского слова —
  //    это пояснение (категория), не пример. Пример: «Параллельные процессы: ...»
  const mLatin = t.search(/[A-Za-z]/)
  const mCyr = t.search(/[а-яА-ЯёЁ]/)
  if (mCyr !== -1 && mLatin !== -1 && mCyr < mLatin) return false

  // 4) Английское предложение: начинается с заглавной английской буквы
  if (!/^[A-Z]/.test(t)) return false

  // 5) Содержит хотя бы один «английский» глагол / модаль / вспомогательный
  if (!/\b(will|would|can|could|may|might|shall|should|must|do|does|did|have|has|had|is|are|was|were|be|been|being|am|not|don't|doesn't|didn't|won't|wouldn't|can't|couldn't|shouldn't|isn't|aren't|wasn't|weren't|haven't|hasn't|hadn't)\b/i.test(t))
    return false

  // 6) Заголовок категории: «English Name (Emoji):» — НЕ пример
  if (/^[A-Z][a-zA-Z\s]+\([^)]*\)\s*:/.test(t)) return false

  // 7) Не слишком длинная (>120 символов) — длинные строки обычно смешанные
  if (t.length > 120) return false

  return true
}

/** Разбивает текст слайда на сегменты: обычный текст и примеры. */
function parseSlideSegments(text: string): Array<{ type: "text" | "example"; content: string }> {
  const lines = text.split("\n")
  const segments: Array<{ type: "text" | "example"; content: string }> = []
  let buffer = ""

  for (const line of lines) {
    if (isExampleLine(line)) {
      // Сохраняем накопленный текст
      if (buffer.trim()) {
        segments.push({ type: "text", content: buffer.trim() })
        buffer = ""
      }
      segments.push({ type: "example", content: line.trim() })
    } else {
      buffer += (buffer ? "\n" : "") + line
    }
  }
  if (buffer.trim()) {
    segments.push({ type: "text", content: buffer.trim() })
  }
  return segments
}

export default function EpochTheory({
  theory,
  theoryQuiz,
  music,
  icon,
  title,
  subtitle,
}: {
  theory: TheoryStep[]
  theoryQuiz: TheoryQuizItem[]
  music: EpochMusic
  /** Эмодзи эпохи из index.json (обложка). */
  icon?: string
  /** Название эпохи (обложка). */
  title?: string
  /** Подзаголовок эпохи (обложка). */
  subtitle?: string
}) {
  // Презентация: открыта ли, текущая фаза (слайды → тест → музыка), слайд.
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>("slides")
  const [slide, setSlide] = useState(0)

  // Мини-тест: текущий вопрос, выбранный вариант, состояние проверки.
  const [quizIndex, setQuizIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const [score, setScore] = useState(0)
  const [quizDone, setQuizDone] = useState(false)

  // Копирование Suno-промпта в буфер обмена.
  const [copied, setCopied] = useState(false)

  // G8 (правки 12.08): озвучка правила на слайде теории — кнопка «Послушай!».
  // Гибрид как в VoiceChatTask: Web Speech (если есть en-голос) → серверный
  // /api/tts (Яндекс-браузер и т.п.). Хуки вызываются ДО ранних return —
  // правила хуков.
  const { speak, stop, speaking: wsSpeaking, supported: ttsSupported } = useSpeechSynthesis()
  const serverTts = useServerTts()
  const stopAll = useCallback(() => {
    stop()
    serverTts.stop()
  }, [stop, serverTts.stop])
  const speaking = wsSpeaking || serverTts.speaking

  /** Озвучить/остановить текст текущего слайда теории. */
  const speakSlide = () => {
    if (slide === 0) return
    const text = slides[slide - 1]?.text
    if (!text) return
    if (speaking) {
      stopAll()
      return
    }
    if (ttsSupported) speak(text)
    else serverTts.speak(text)
  }

  // Стоп озвучки при смене слайда/фазы и при закрытии презентации.
  useEffect(() => {
    stopAll()
  }, [slide, phase, open, stopAll])

  // Стоп озвучки при размонтировании (уход со страницы эпохи).
  useEffect(() => () => stopAll(), [stopAll])

  const slides = Array.isArray(theory) ? theory : []
  const quiz = Array.isArray(theoryQuiz) ? theoryQuiz : []
  const hasMusic =
    !!music &&
    typeof music === "object" &&
    (Array.isArray(music.links) ? music.links.length > 0 : false)

  // Если у эпохи нет ни теории, ни теста, ни музыки (напр. present-simple —
  // зона T01) — ничего не рендерим: кнопки «Смотреть инструктаж» не будет.
  const hasAny = slides.length > 0 || quiz.length > 0 || hasMusic
  if (!hasAny) return null

  const hasQuiz = quiz.length > 0

  /** Открытие презентации — сброс к началу (слайд 1, тест с нуля). */
  const openPresentation = () => {
    setSlide(0)
    // Если теории нет (только тест/музыка) — стартуем не с пустых слайдов.
    setPhase(slides.length > 0 ? "slides" : hasQuiz ? "quiz" : "music")
    setQuizIndex(0)
    setSelected(null)
    setChecked(false)
    setScore(0)
    setQuizDone(false)
    setCopied(false)
    setOpen(true)
  }

  /** G4 (клиентские правки 08.08.2026): музыка доступна СРАЗУ, без
   *  прохождения мини-теста — открываем презентацию на музыкальном блоке. */
  const openMusic = () => {
    setSlide(0)
    setPhase("music")
    setQuizIndex(0)
    setSelected(null)
    setChecked(false)
    setScore(0)
    setQuizDone(false)
    setCopied(false)
    setOpen(true)
  }

  const closePresentation = () => {
    setOpen(false)
  }

  /** «Вперёд →» в фазе слайдов: следующий слайд (0 — обложка) → тест → закрыть.
   *  G10 (правки 12.08): музыка больше НЕ продолжение инструктажа — после
   *  слайдов идём только к мини-тесту (если он есть), иначе закрываем. */
  const nextSlide = () => {
    if (slide < slides.length) {
      setSlide((s) => s + 1)
    } else if (phase === "slides") {
      if (hasQuiz) {
        setPhase("quiz")
        setSlide(0)
      } else {
        closePresentation()
      }
    }
  }

  const prevSlide = () => {
    if (slide > 0) {
      setSlide((s) => s - 1)
    }
  }

  // Десктоп: стрелки ←/→ листают слайды, Escape закрывает презентацию.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closePresentation()
      } else if (e.key === "ArrowRight" && phase === "slides") {
        nextSlide()
      } else if (e.key === "ArrowLeft" && phase === "slides") {
        prevSlide()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, phase, slide, hasQuiz, slides.length])

  // Блокируем прокрутку страницы под открытой презентацией.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(music.sunoPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard может быть недоступен — молча игнорируем */
    }
  }

  const checkAnswer = () => {
    if (selected === null) return
    setChecked(true)
    if (quiz[quizIndex].options[selected] === quiz[quizIndex].answer) {
      setScore((s) => s + 1)
    }
  }

  const nextQuestion = () => {
    if (quizIndex + 1 >= quiz.length) {
      setQuizDone(true)
      return
    }
    setQuizIndex((i) => i + 1)
    setSelected(null)
    setChecked(false)
  }

  const retryQuiz = () => {
    setQuizIndex(0)
    setSelected(null)
    setChecked(false)
    setScore(0)
    setQuizDone(false)
  }

  const goBackToSlides = () => {
    setPhase("slides")
    setSlide(0)
  }

  const isLastSlide = slide >= slides.length

  // W1-T02: обложка (слайд 0) — эмодзи icon эпохи; фолбэк — первый эмодзи
  // первого слайда теории (у present-simple icon нет в контенте → 📸).
  const coverEmoji =
    (icon && icon.trim()) || firstEmoji(slides[0]?.title ?? "") || ""
  // Двойной эмодзи (⏱️⏭️) не влезет в плашку 96px в text-6xl — уменьшаем.
  const coverEmojiSize =
    (coverEmoji.match(/\p{Extended_Pictographic}/gu) || []).length > 1
      ? "text-4xl"
      : "text-6xl"
  // Слайд теории: первый эмодзи из theory[].title — в плашку слева,
  // из заголовка убрать (не дублировать). Слайд 0 — обложка, слайд i>0 —
  // theory[i-1].
  const slideEmoji = slide > 0 ? firstEmoji(slides[slide - 1].title) : null
  const slideTitle =
    slide > 0
      ? slideEmoji
        ? slides[slide - 1].title.replace(slideEmoji, "").trim()
        : slides[slide - 1].title
      : ""

  return (
    <>
      {/* ——— Кнопки в шапке эпохи (НЕ автоматическое открытие) ———
          G4: «🎵 Музыка эпохи» — музыка доступна СРАЗУ, без мини-теста. */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={openPresentation}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-base font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-700"
        >
          <span aria-hidden="true">▶</span> Смотреть инструктаж
        </button>
        {hasMusic && (
          <button
            type="button"
            onClick={openMusic}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-violet-200 bg-violet-50 px-4 py-3 text-base font-bold text-violet-700 transition-colors hover:bg-violet-100"
          >
            <span aria-hidden="true">🎵</span> Музыка эпохи
          </button>
        )}
      </div>

      {/* ——— Полноэкранная презентация поверх карты эпохи ——— */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-900/70 backdrop-blur-sm sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Инструктаж эпохи"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:max-w-lg sm:rounded-3xl"
            >
              {/* Шапка презентации: название фазы + «✕» */}
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-primary-100 bg-primary-50/60 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-display truncate text-base font-extrabold tracking-tight text-primary-900">
                    {phase === "slides"
                      ? "Инструктаж"
                      : phase === "quiz"
                        ? "Проверь себя"
                        : "Музыкальная пауза"}
                  </p>
                  <p className="truncate text-[11px] font-bold uppercase tracking-wide text-primary-400">
                    {phase === "slides"
                      ? "Теория эпохи"
                      : phase === "quiz"
                        ? "Мини-тест по инструктажу"
                        : "Песни и Suno-промпт"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePresentation}
                  aria-label="Закрыть инструктаж"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-black text-primary-700 shadow-soft transition-colors hover:bg-primary-100"
                >
                  ✕
                </button>
              </div>

              {/* ——— Фаза 1: слайды (0 — обложка, 1..N — теория) ——— */}
              {phase === "slides" && slides.length > 0 && (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={slide}
                        initial={{ opacity: 0, x: 28 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -28 }}
                        transition={{ duration: 0.18 }}
                      >
                        {slide === 0 ? (
                          /* ——— Обложка (титульный слайд, W1-T02) ——— */
                          <div className="flex flex-col items-center gap-4 py-2 text-center">
                            <div
                              className="flex h-24 w-24 items-center justify-center rounded-2xl border border-primary-300 bg-primary-500/15 shadow-soft"
                              aria-hidden="true"
                            >
                              <span className={`leading-none ${coverEmojiSize}`}>
                                {coverEmoji || "🕰️"}
                              </span>
                            </div>
                            <h3 className="font-display text-3xl font-black leading-tight tracking-tight text-primary-900">
                              {title || "Эпоха"}
                            </h3>
                            {subtitle && (
                              <p className="text-base font-semibold leading-snug text-slate-600">
                                {subtitle}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => setSlide(1)}
                              className="mt-1 flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-primary-100 px-8 py-2 text-base font-bold text-primary-700 transition-colors hover:bg-primary-200"
                            >
                              Начать →
                            </button>
                          </div>
                        ) : (
                          /* ——— Слайд теории: эмодзи-плашка + заголовок без эмодзи ——— */
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                            {slideEmoji && (
                              <div
                                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-primary-300 bg-primary-500/15 shadow-soft"
                                aria-hidden="true"
                              >
                                <span className="text-6xl leading-none">
                                  {slideEmoji}
                                </span>
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              {/* G8 (правки 12.08): кнопка «Послушай!» рядом
                                  с заголовком слайда — озвучка текста правила
                                  голосом Verb Bot (гибрид Web Speech + /api/tts). */}
                              <div className="mb-3 flex items-start justify-between gap-3">
                                <h3 className="font-display text-2xl font-black leading-tight tracking-tight text-primary-900 sm:text-3xl">
                                  {slideTitle}
                                </h3>
                                <button
                                  type="button"
                                  onClick={speakSlide}
                                  aria-pressed={speaking}
                                  aria-label={speaking ? "Остановить озвучку" : "Послушать правило"}
                                  className={`flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-2xl border-2 px-4 py-2 text-base font-bold transition-colors ${
                                    speaking
                                      ? "border-danger bg-danger/10 text-danger"
                                      : "border-primary-200 bg-white text-primary-700 hover:bg-primary-50"
                                  }`}
                                >
                                  {speaking ? "⏹ Стоп" : "🔊 Послушай!"}
                                </button>
                              </div>
                              {/* T02 (правки 13–14.08): маскот инструктажа
                                  НАД текстом слайда — «как будто это он
                                  говорит» (картинка клиентки, /mascot/
                                  instruct.jpg, круглая обрезка). Иконка
                                  рупора рядом визуально связывает маскота
                                  с кнопкой «🔊 Послушай!» выше. */}
                              <div className="mb-3 flex items-center gap-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src="/mascot/instruct.jpg"
                                  alt="Verb Bot — инструктаж"
                                  className="h-20 w-20 shrink-0 rounded-full border-2 border-primary-200 object-cover shadow-soft"
                                />
                                <div className="flex items-center gap-2 rounded-2xl border-2 border-primary-200 bg-white px-3 py-2 shadow-soft">
                                  <span
                                    className="text-2xl leading-none"
                                    aria-hidden="true"
                                  >
                                    📢
                                  </span>
                                  <p className="text-sm font-bold text-primary-700">
                                    Слушай меня — жми «🔊 Послушай!»
                                  </p>
                                </div>
                              </div>
                              {/* Сегментированный рендеринг: обычный текст + примеры */}
                              <div className="space-y-3">
                                {parseSlideSegments(slides[slide - 1].text).map(
                                  (seg, si) =>
                                    seg.type === "text" ? (
                                      <p
                                        key={si}
                                        className="whitespace-pre-line text-base font-medium leading-relaxed text-slate-600"
                                      >
                                        {seg.content}
                                      </p>
                                    ) : (
                                      <div
                                        key={si}
                                        className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-center shadow-sm"
                                      >
                                        <p className="whitespace-pre-line text-base font-semibold italic leading-relaxed text-amber-900">
                                          {seg.content}
                                        </p>
                                      </div>
                                    ),
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Прогресс: точки + счётчик «слайд N из M» (обложка = слайд 1) */}
                  <div className="flex shrink-0 flex-col items-center gap-2 border-t border-primary-100 px-4 pb-3 pt-3">
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: slides.length + 1 }, (_, i) => i).map(
                        (i) => (
                          <button
                            key={i}
                            type="button"
                            aria-label={`Слайд ${i + 1} из ${slides.length + 1}`}
                            onClick={() => setSlide(i)}
                            className={`h-2.5 rounded-full transition-all ${
                              i === slide
                                ? "w-6 bg-primary-600"
                                : "w-2.5 bg-primary-200 hover:bg-primary-300"
                            }`}
                          />
                        )
                      )}
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      слайд {slide + 1} из {slides.length + 1}
                    </p>
                  </div>

                  {/* Навигация: на обложке её заменяет кнопка «Начать →» */}
                  {slide > 0 && (
                    <div className="flex shrink-0 items-center justify-between gap-2 border-t border-primary-100 px-4 pb-4 pt-3">
                      <button
                        type="button"
                        onClick={prevSlide}
                        disabled={slide === 0}
                        className="flex min-h-[44px] items-center justify-center rounded-2xl bg-primary-100 px-4 py-2 text-base font-bold text-primary-700 transition-colors hover:bg-primary-200 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ← Назад
                      </button>
                      <button
                        type="button"
                        onClick={nextSlide}
                        className="flex min-h-[44px] items-center justify-center rounded-2xl bg-primary-600 px-6 py-2 text-base font-bold text-white transition-colors hover:bg-primary-700"
                      >
                        {isLastSlide
                          ? hasQuiz
                            ? "К тесту →"
                            : "Завершить ✕"
                          : "Вперёд →"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ——— Фаза 2: мини-тест ——— */}
              {phase === "quiz" && (
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                  {quizDone ? (
                    <div className="flex flex-col items-center gap-3 py-4 text-center">
                      <div className="text-5xl" aria-hidden="true">
                        {score === quiz.length ? "🏆" : "🌟"}
                      </div>
                      <p className="font-display text-lg font-extrabold text-primary-900">
                        {score} из {quiz.length}
                      </p>
                      <p className="text-sm font-medium text-slate-500">
                        {score === quiz.length
                          ? "Идеально! Ты готов к миссии!"
                          : "Хорошее начало! Повтори инструктаж и попробуй ещё раз."}
                      </p>
                      <div className="mt-1 flex w-full flex-col gap-2">
                        <button
                          type="button"
                          onClick={retryQuiz}
                          className="min-h-[44px] w-full rounded-2xl bg-primary-100 px-6 py-2 text-sm font-bold text-primary-700 transition-colors hover:bg-primary-200"
                        >
                          ↻ Ещё раз
                        </button>
                        {/* G10 (правки 12.08): музыка вынесена из инструктажа —
                            после мини-теста инструктаж завершается (кнопка
                            «🎵 Музыка эпохи» на странице эпохи + /music). */}
                        <button
                          type="button"
                          onClick={closePresentation}
                          className="min-h-[44px] w-full rounded-2xl bg-primary-600 px-6 py-2 text-base font-bold text-white transition-colors hover:bg-primary-700"
                        >
                          Завершить ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={quizIndex}>
                      <p className="mb-3 text-sm font-bold leading-snug text-slate-700">
                        {quizIndex + 1}. {quiz[quizIndex].question}
                      </p>
                      <div className="flex flex-col gap-2">
                        {quiz[quizIndex].options.map((opt, oi) => {
                          const isCorrect =
                            checked && opt === quiz[quizIndex].answer
                          const isWrongPick =
                            checked &&
                            selected === oi &&
                            opt !== quiz[quizIndex].answer
                          return (
                            <button
                              key={oi}
                              type="button"
                              disabled={checked}
                              onClick={() => setSelected(oi)}
                              className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-2xl border-2 px-3 py-2 text-left text-sm font-bold transition-colors ${
                                isCorrect
                                  ? "border-success bg-success/10 text-success"
                                  : isWrongPick
                                    ? "border-danger bg-danger/10 text-danger"
                                    : selected === oi
                                      ? "border-primary-400 bg-primary-50 text-primary-900"
                                      : "border-primary-100 bg-white text-slate-700 hover:bg-primary-50"
                              }`}
                            >
                              <span>{opt}</span>
                              {isCorrect && <span aria-hidden="true">✓</span>}
                              {isWrongPick && <span aria-hidden="true">✗</span>}
                            </button>
                          )
                        })}
                      </div>
                      <div className="mt-3">
                        {!checked ? (
                          <button
                            type="button"
                            disabled={selected === null}
                            onClick={checkAnswer}
                            className="min-h-[44px] w-full rounded-2xl bg-primary-600 px-4 py-2 text-base font-bold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Проверить
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={nextQuestion}
                            className="min-h-[44px] w-full rounded-2xl bg-primary-600 px-4 py-2 text-base font-bold text-white transition-colors hover:bg-primary-700"
                          >
                            {quizIndex + 1 >= quiz.length
                              ? "К результатам"
                              : "Далее →"}
                          </button>
                        )}
                      </div>
                      <div className="mt-3 text-center">
                        <button
                          type="button"
                          onClick={goBackToSlides}
                          className="min-h-[44px] rounded-2xl px-4 py-2 text-sm font-bold text-primary-500 transition-colors hover:bg-primary-50 hover:text-primary-700"
                        >
                          ← К слайдам
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ——— Фаза 3: музыкальный блок ——— */}
              {phase === "music" && hasMusic && (
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                  <h3 className="font-display mb-2 text-xl font-black tracking-tight text-primary-900">
                    {music.title}
                  </h3>
                  <p className="mb-3 text-sm font-medium leading-snug text-slate-600">
                    Включи аудиальную память — спой песню по теме эпохи как в
                    караоке!
                  </p>
                  {Array.isArray(music.links) && music.links.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {music.links.map((link, i) =>
                        /^https?:\/\//i.test(link) ? (
                          <a
                            key={i}
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="flex min-h-[44px] items-center gap-1.5 rounded-full border-2 border-violet-200 bg-white px-4 py-2 text-sm font-bold text-violet-700 shadow-soft transition-colors hover:bg-violet-50"
                          >
                            🎵 Слушать песни
                          </a>
                        ) : (
                          <span
                            key={i}
                            className="flex min-h-[44px] items-center rounded-full border-2 border-dashed border-violet-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-500"
                          >
                            🎵 {link.replace(/^\[|\]$/g, "")}
                          </span>
                        )
                      )}
                    </div>
                  )}
                  <div className="rounded-2xl border border-violet-200 bg-white p-3">
                    <p className="mb-1.5 text-xs font-black uppercase tracking-wide text-violet-600">
                      Создай свой трек (Suno AI)
                    </p>
                    <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-slate-600">
                      {music.sunoPrompt}
                    </p>
                    <button
                      type="button"
                      onClick={copyPrompt}
                      className={`mt-3 min-h-[44px] rounded-2xl border-2 px-4 py-2 text-sm font-bold transition-colors ${
                        copied
                          ? "border-success bg-success/10 text-success"
                          : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
                      }`}
                    >
                      {copied ? "✓ Скопировано!" : "Скопировать промпт"}
                    </button>
                  </div>
                  <div className="mt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={closePresentation}
                      className="min-h-[44px] rounded-2xl bg-primary-600 px-8 py-2 text-base font-bold text-white transition-colors hover:bg-primary-700"
                    >
                      Завершить ✕
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
