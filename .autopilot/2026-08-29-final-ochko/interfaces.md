# Интерфейсы и границы

## Правила проекта

- Стек: Next.js 16 App Router, TypeScript, Tailwind.
- Команды: `cd frontend && npx tsc --noEmit`, `cd frontend && npm run build`, `node scripts/verify-epoch.mjs`.
- Данные: `content/epochs/*/index.json` ↔ `frontend/public/content/epochs/*/index.json` byte-identical.

## Границы, решённые в спецификации

| Модуль | Владеет | Выставляет | Прячет |
|---|---|---|---|
| DragAndDropTask | DnD | `id` key, `verb` display, `review` | коллизия |
| EpochTheory | теория | `TheorySlide` | парсинг |
| RightsFooter | футер | 2 абзаца | — |
| FillInTask | перевод | `current` prev/next | — |

## Из таска 01 — DnD

- `future-perfect/a1/station-3.json` `review:true` → разбор ждёт «Далее»
- `DragAndDropTask` `getItemId(id??verb)`, `removeEverywhere(id)` — noon×3

## Из таска 02 — стрелки

- `FillInTask` `canGoForward=current<len-1`, `goTo` сохраняет draft `history[current]`
