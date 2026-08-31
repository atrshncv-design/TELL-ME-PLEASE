# Спецификация: Финал310826 — PDF deferred и остаток

## Задача

Клиентка видит, что правки «не поправил ничего» — код уже в `main` до `bcd8ecb`, но на `space.z-ai` старая сборка. Параллельно просит «Вставить PDF для печати» — пока файлов нет.

## Решение

1. **PDF — deferred**: placeholder `public/pdfs/README.md` + кнопка «Скачать PDF» на странице эпохи (disabled с тултипом «Скоро»), чтобы деплой не ждал файлов. При появлении 12 PDF — просто положить в `public/pdfs/<slug>.pdf` (byte-identical), кнопка станет активной — деплой не сломается при малых файлах.
2. **Футер — одна строка**: `... карты, платформы и обучения …` (добавлено «, платформы»).
3. **Деплой-анализ**: маленькие PDF не ломают `standalone` тарболл 50 MB.

## Пользовательские истории

| # | Метка | История | Приёмка |
|---|-------|---------|---------|
| 1 | R01 placeholder | Как учитель, вижу место для PDF, но пока «Скоро» | на `/epoch/[slug]` кнопка disabled + тултип, `public/pdfs/README.md` существует |
| 2 | R02 | Как читатель, вижу футер с «платформы» | `RightsFooter` содержит `…, платформы и обучения…` + телефон `+7 929 275 10 54` |
| 3 | R03 | Как ученик, вижу все предыдущие правки на проде | `space.z-ai` показывает последний `main` (`bcd8ecb`+) — `verify-epoch/content` зелёные |

## Решения по реализации

- **PDF**: `frontend/public/pdfs/` — 12 файлов `present-simple.pdf` … `future-perfect-continuous.pdf` + `exam.pdf` (пока только `README.md` + `.gitkeep`). `EpochPage` (`frontend/src/app/epoch/[slug]/page.tsx`) — секция «Материалы для печати» с `<a href="/pdfs/${slug}.pdf" download>` disabled если файла нет (проверка `fs.existsSync` на сервере или fetch HEAD). Пока файлов нет — deferred.
- **Деплой-анализ**: `frontend/public` сейчас 4.0 MB, `content` 2.9 MB. `.zscripts/build.sh` копирует `public` целиком в `next-service-dist/public` (не через tracing), `outputFileTracingExcludes` уже исключает `skills/**`/`tell-me-please/**`. Тарболл сейчас ~30 MB (оценка: `du -sh .next` 353 MB → standalone ~25 MB + public 4 MB). 12 PDF × 200 KB = 2.4 MB, даже 12×500 KB=6 MB → <36 MB < 50 MB лимита, сборка не падает. Риск только если PDF > 10 MB каждый или в `skills/`. Рекомендация: держать каждый PDF < 1 MB, всего < 10 MB.
- **Футер**: `frontend/src/components/RightsFooter.tsx:1` — добавить `, платформы` в первую фразу.
- **Деплой видимости**: правки уже в `main` (`95358e7` `bcd8ecb`), но `space.z-ai` требует `Publish` — после этого `timetravelmission.space.z.ai` покажет визуал, `noon×3`, стрелки, `не: Did you played?`.

## Границы и швы

| Модуль | Владеет | Выставляет | Прячет |
|---|---|---|---|
| EpochPage | PDF кнопка | `/pdfs/${slug}.pdf` | existence check |
| RightsFooter | футер | 2 абзаца | — |
| Build | тарболл | `public/pdfs` | tracing excludes |

Швы: `RightsFooter` для футера, `EpochPage` для PDF, `build.sh` для лимита 50 MB.

## Вне рамок

| Требование | Почему не сейчас |
|---|---|
| Генерация PDF из теорий | Пока deferred — файлов нет, placeholder достаточно |

## Открытые места

- R01 placeholder — PDF-файлы ожидаются от клиентки; как придут — заменю README на 12 PDF, без изменения кода.

## Покрытие манифеста

| Требование | Раздел |
|---|---|
| R01 | 1, placeholder |
| R02 | 2 |
| R03 | 3 |
