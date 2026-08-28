# Интерфейсы и границы

## Правила проекта

- Стек: Next.js 16 App Router, TypeScript, Tailwind.
- Команды: `cd frontend && npx tsc --noEmit`, `cd frontend && npm run build`, `node scripts/verify-epoch.mjs`.
- Данные эпох: `content/epochs/<slug>/` и побайтное зеркало `frontend/public/content/epochs/<slug>/`.
- НЕ ТРОГАТЬ: `frontend/src/server/**`, `/api/**`, `.zscripts/`, `content` без задачи; новая зависимость = `BLOCKED`.

## Границы, решённые в спецификации

| Модуль | Владеет | Выставляет | Прячет |
|---|---|---|---|
| Epoch JSON и index | тексты, задания, порядок станций | контракт текущего `TaskRenderer` | внутренние формулировки и варианты |
| `EpochTheory` | CTA, слайды теории и названия песен | рендер теории из `index.json` | разбиение слайдов |
| `QuizTask` | выбор, вердикт и задержку перехода | единый UI quiz | CSS-состояние верного/неверного выбора |
| `VoiceChatTask` | вопрос, подсказку, вердикт и навигацию | отображение конкретной voice-chat станции | раскладку скролла и позиции управляющих кнопок |
| `ExamEntryCard` | переход пользователя к экзамену | ссылка на `/exam` | детали локальной проверки прогресса |

## Из таска 01 — Общие UI-правки

- `ExamEntryCard({unlocked?: boolean})` — всегда активная ссылка на `/exam`, без проверки FPC-прогресса
- `EpochTheory` CTA — `Смотреть Обучение` во всех эпохах
- `VoiceChatTask` — sticky-контейнер вердикта/кнопки `Следующий вопрос` вне прокрутки
- `RightsFooter` — перенос `Ирина Булдакова` на новую строку

## Из таска 02 — Present Simple

- `EpochMusic` — `title, links, sunoPrompt, tracks?:{title,url}[]` рендерит названия песен; порядок из документа
- `content/epochs/present-simple/a1/station-filter.json` — quiz 15 items To be vs смысловой глагол
- `present-simple/index.json` theory slide 5 содержит рамку `We, You, They are happy`; `I play → He plays` в рамке

## Из таска 03 — Present Continuous

- `content/epochs/present-continuous/index.json` theory[3..5] пронумерованы `1. … 7.` (только PC)

## Из таска 04 — Past Simple

- `content/epochs/past-simple/a1/station-0.json` — V1/V2/V3 + перевод 28 глаголов + подсказка IVERBS без URL
- `past-simple/b1/station-8.json` — `promptCard.extra.lines[7]` примерные вопросы

## Из таска 05 — Past Continuous

- `content/epochs/past-continuous/a2/station-1.json` — один `___` на item, `options[2]`
- `content/epochs/past-continuous/b2/station-6.json` — один текст Гагарина + монолог-образец `Life 100 years ago`

## Из таска 06 — Present Perfect B1

- `station-4.json` — `rounds[0]{text:11×"___", answers[11], word_bank[22]}`
- `station-5.json` — `items[9] sentence "___ (V1)"`, `item7 answer ["have spilt","have spilled"]`
- `station-3.json` — `items[10] sentence "___ (V1)"` без готовых форм

## Из таска 07 — PPC/Future

- `present-perfect-continuous/a1/station-2.json` — 10 items (+5 отрицаний), `past-perfect-continuous/a1/station-2.json` — 10 items (очищена)
- `present-perfect-continuous/index.json` — A2/B1 `station-8` сняты с регистрации (файлы сохранены)
- `future-simple/index.json` — A2 `station-8` снята; `future-simple/b2/station-8.json` — диалог `**Имя:**` bold
- `future-perfect-continuous/b1/station-6.json` — checklist hint `Примерный ответ: …` без дубля вопроса
