# Интерфейсы и границы

## Правила проекта

- Стек: Next.js 16 App Router, TypeScript, Tailwind.
- Команды: `cd frontend && npx tsc --noEmit`, `cd frontend && npm run build`, `node scripts/verify-epoch.mjs`.
- Данные: `content/epochs/*/index.json` ↔ `frontend/public/content/epochs/*/index.json` byte-identical.

## Границы, решённые в спецификации

| Модуль | Владеет | Выставляет | Прячет |
|---|---|---|---|
| EpochTheory | теория эпох | `TheorySlide {title,text}` рендер | парсинг `\n\n` и `1.` |
| Quiz/Cloze/Flashcards | навигация вопросов | `current`, `prev/next` | состояние ответа |
| DragAndDropTask | DnD + tap | `id` key, `verb` display | коллизия ключей |
| RightsFooter | футер | текст 2 абзаца | — |

## Из таска 01 — визуально красиво

- `EpochTheory.tsx` — `preprocessTheoryText`: `:`+`1.` → `\n\n`, `).2.` → `)\n\n2.`; `parseTheoryBlocks` → `heading|numbered|text|example` с `mt-6`/`mb-4`/`bg-amber-50`
- `content/epochs/*/index.json` — 4 теории с `\n\n` и карточками, TO BE рамка сохранена

## Из таска 02 — noon, футер, стрелки

- `future-perfect/a1/station-3.json` — `id: noon-1/2/3`, `verb:"noon"` distinct, BY/AT
- `DragAndDropTask.tsx` — `key=getItemId(id??verb)` display `verb`
- `RightsFooter.tsx` — 2 `<p>` новый порядок `+7 929 275 10 54`
- `QuizTask/ClozeTextTask/FlashcardsTask` — `current` + `prev/next` без `onComplete`

## Из таска 03 — перевод

- `present-perfect/b1/station-3.json` — 3-й `(publish)`, 6–10 `have/has` 
- `present-perfect/b1/station-4.json` — `description` содержит `( Pr.Simple, Pr.Continuous, Pr. Perfect, Past Simple)`
