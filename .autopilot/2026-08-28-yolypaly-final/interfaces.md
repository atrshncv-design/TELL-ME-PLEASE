# Интерфейсы и границы

## Правила проекта

- Стек: Next.js 16 App Router, TypeScript, Tailwind.
- Команды: `cd frontend && npx tsc --noEmit`, `cd frontend && npm run build`, `node scripts/verify-epoch.mjs`, `node scripts/verify-content.mjs`.
- Данные: `content/epochs/<slug>/` ↔ `frontend/public/content/epochs/<slug>/` byte-identical; экзамен `content/exam/` ↔ `frontend/public/content/exam/`.
- НЕ ТРОГАТЬ: `frontend/src/server/**`, `/api/**`, `.zscripts/`, зависимости.

## Границы, решённые в спецификации

| Модуль | Владеет | Выставляет | Прячет |
|---|---|---|---|
| Epoch JSON/index | тексты, задания, порядок | контракт `TaskRenderer` | формулировки |
| `QuizTask`/`FillIn` | выбор и вердикт | `answer: string|string[]` | CSS цвета |
| `Exam` | экзамен и миссии | `/exam`, `/exam/[sector]/[stationId]` | прогресс-гейт |
| `MissionPage` | карта + финал | `EpochMapPoster` + `ExamFinalBlock` | расположение |

## Из таска 01 — UI рамка, цвет, экзамен

- `present-simple/index.json` theory[3,4] содержит `I am / He is / They are` в рамке (amber)
- `MissionPage` (`frontend/src/app/mission/page.tsx`) рендерит `ExamEntryCard` ниже `EpochMapPoster` → `/exam`
- `QuizTask` — `handleSelect` теперь `setSelected+setShowResult`, `optionVerdictStyle` сразу

## Из таска 02 — Past Simple

- `past-simple/a1/station-0.json` — `explanation: "V1 — V2 — V3 — перевод"`×28, показывается после `showResult`
- `past-simple/a2/station-3.json` — sushi `Have you tried` vs `Did you try`

## Из таска 03 — Present Perfect B1

- `present-perfect/b1/station-4.json` — `rounds[0] 11×___`, `answers 11`, `hints (V1)`, `word_bank` с `showed`
- `FillInTask` — `blankCount===1 && answers.length>1 ⇒ answers.some()=green` для `have spilled/have spilt`

## Из таска 04 — PPC / Future дубли

- `present-perfect-continuous/index.json` — по одной `station-8` на a2/b1 (файлы сохранены)
- `future-simple/index.json` — по одной `station-8` на a2/b2 (файлы сохранены)
- `past-continuous/b2/station-6.json` — без регрессии (два монолога)

## Из таска 05 — Future Perfect BY/AT

- `future-perfect/a1/station-3.json` — опции без `by`/`at`, только маркеры, ответы BY/AT в корзинах

## Из таска 06 — Великий экзамен

- `content/exam/sector-1/station-4.json` — `___ the guitar` + `word_bank` с `write/am studying/passed/play`
- `content/exam/sector-3/station-4.json` — 8 пропусков `are launching…will have returned`
