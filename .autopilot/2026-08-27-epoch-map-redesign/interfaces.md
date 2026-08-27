# Границы, решённые в спецификации

| Модуль | Владеет | Выставляет | Прячет |
|---|---|---|---|
| `lib/epochs-meta.ts` | метаданные 12 эпох + раскладка матрицы | `EPOCH_META: {slug, number, title, tagline, icon, cell: {row, col}}` | — |
| `components/EpochMapPoster.tsx` | десктоп-карта: фон-плакат, слоты, галочки, клики | `<EpochMapPoster progress={...} />` | геометрию ячеек (доли viewBox) |
| `components/RightsFooter.tsx` | блок прав | `<RightsFooter />` | — |
| `app/epoch/[slug]/page.tsx` | страница эпохи | — (добавляет ExamEntryCard для FPC) | — |
| `app/mission/page.tsx` | переключение плакат/список по ширине | — | — |

## Правила проекта (для исполнителей)

- Next.js 16.2.10 App Router, React 19, Tailwind 4, framer-motion. Клиентские страницы — `"use client"`.
- Проверки обязательны: `cd frontend && npx tsc --noEmit` (0 ошибок) и `npm run build` (успех).
- Комментарии на русском, по намерению; без необходимости не добавлять.
- События-константы с префиксом `tmp-`.
- Новая зависимость = верни `BLOCKED` с обоснованием, ничего не ставить самому.
- Контент `content/` и `frontend/public/content/` НЕ трогать (зеркала, байт-в-байт).
- Прогресс — только через существующие функции `frontend/src/lib/epoch.ts` + localStorage `tmp_progress_grade_<N>`; новых хранилищ нет.
- НЕ ТРОГАТЬ: `frontend/src/server/**`, `frontend/src/app/api/**`, `.zscripts/`, `frontend/src/lib/useSound.ts` (кроме чтения).
- Плакат: исходник `плакат.svg` в корне репо (15MB); в проект идёт оптимизированный `frontend/public/map/epoch-map.svg` ≤700KB. Оптимизация — один раз, локальными средствами (`sips`/python), без npm-пакетов.
- Порог «пройдено» = все 4 сектора эпохи (A1/A2/B1/B2). Одинаков для галочки и входа на экзамен.

## Из таска 01 — плакат-ассет, метаданные, компонент карты

- `EPOCH_META: EpochMeta[]` из `@/lib/epochs-meta` — slug, number, title, tagline, icon, cell{row,col} (типы `EpochMeta`, `EpochRow`, `EpochCol`).
- `EpochMapPoster({ progress: EpochProgress, onFallback?: () => void })` — default export из `@/components/EpochMapPoster`; прогресс — тип из `lib/epoch.ts`; `onFallback` зовётся при ошибке загрузки фона.
- Ассет: `frontend/public/map/epoch-map.svg` (384KB, растры в data-URI: JPEG-фон + WebP робот/спутник — внешние ссылки из SVG через <img> не работают).
- Замеченное (до таска, не трогал): `saveTask` пишет task.id («a1_station_1»), `stationPassed` читает station.id («station-1») — семантика галочки наследует lib/epoch.ts как есть.

## Из таска 03 — вход на экзамен FPC

- `<ExamEntryCard unlocked={boolean} />` из `@/components/ExamEntryCard` — роутит на `/exam` при unlocked; иначе серая, disabled, подсказка.
- Страница `/epoch/[slug]` вычисляет unlocked для slug `future-perfect-continuous`: все станции всех 4 секторов пройдены (doneStations >= totalStations, как у «Портал открыт!»).

## Швы

Публичные страницы `/`, `/mission`, `/epoch/future-perfect-continuous` + `tsc` + `next build`. Новых швов нет.
