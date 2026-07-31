# TICKETS — Фаза 2: Живой MVP на space.z-ai

_Источник: `docs/SPEC-spacezai-live-mvp.md`. Порядок = зависимостями (блокеры первыми). Статусы: ready-for-agent / in progress / done / failed._

## T01 — LLM-чат в Next.js API Routes (SSE + ротация ключей + промпт-роутер)

**Задача.** Перенести логику `backend/app/main.py` (LLM-чат) в Next.js API Routes: `frontend/src/app/api/chat/stream/route.ts` — POST-запрос, ответ SSE (`ReadableStream`, `text/event-stream`). Контракт событий фазы 1: `init` → `user` → токены → `done`/`error`. Перенести: `key_rotation.py` (in-memory ротация по 429/пустому content, `LLM_API_KEYS` из env), `prompt_router.py` + `prompts_config.json` (роли по task_id → fallback grade_N, без динамической генерации), ветки `final_feedback`/`_session_timer` (3-мин финал). Модели: `LLM_MODELS` из env, проверить актуальный список `opencode.ai/zen/v1/models`.

**Приёмка.** `tsc --noEmit` 0 ошибок; `npm run build` зелёный; локальный прогон: POST → SSE-стрим токенов → `done`; 3-мин финал срабатывает; ротация на 429 работает (мок).

**Blocked by:** — | **Status:** ready-for-agent

## T02 — Браузерный TTS + SSE-клиент вместо WebSocket

**Задача.** Хук `useSpeechSynthesis` (`frontend/src/lib/useSpeechSynthesis.ts`): выбор лучшего en-US голоса (Google UK English → Microsoft → Siri), `voiceschanged`, rate ≈ 1.0, озвучка реплик ИИ. Заменить `useWebSocket` на SSE-клиент (`fetch` + парсинг `ReadableStream`) в `VoiceChatTask.tsx`. Текст ответа всегда показывается на экране (фолбэк при отсутствии голоса). Убрать `useAudioPlayer` из голосового пути (Kokoro больше нет).

**Приёмка.** Голосовое задание локально: реплика ИИ озвучивается speechSynthesis + видна текстом; в браузере без голоса — только текст, без ошибок; микрофон оживает после реплики.

**Blocked by:** T01 | **Status:** ready-for-agent

## T03 — Очередь и трейтлимит LLM-запросов

**Задача.** In-memory FIFO-очередь + семафор: максимум **8 одновременных LLM-запросов**, остальные ждут (таймаут ожидания ~30с). Пока запрос в очереди — клиент получает от сервера событие `queued` и показывает реплику персонажа «Думаю над твоими словами…» (текст, анимация печати; голосом не озвучивается). Мягкое падение: таймаут/все ключи исчерпаны → извиняющаяся реплика персонажа + предложение повторить. При свободном слоте очередь невидима (задержка = 0).

**Приёмка.** Скрипт `scripts/load-test.mjs`: 10 одновременных POST → 8 обрабатываются, 2 получают `queued` → ответили все, 0 ошибок 500; одиночный запрос — без события `queued`.

**Blocked by:** T01 | **Status:** ready-for-agent

## T04 — Аналитика: POST /api/event → JSONL

**Задача.** Перенести приём событий воронки из `backend` в `frontend/src/app/api/event/route.ts`: append в `data/events.jsonl` (fs). События: `grade_selected`, `section_selected`, `task_started`, `task_completed(+score)`, `task_abandoned`, `voice_session_started`, `voice_session_ended`. Анонимный device-session ID (localStorage). Проверить `useAnalytics.ts` (endpoint обновить на `/api/event`).

**Приёмка.** Прогон воронки локально → события в `data/events.jsonl`; `tsc`/`build` зелёные.

**Blocked by:** T01 | **Status:** ready-for-agent

## T05 — Админ-панель: кнопка → модалка → дашборд

**Задача.** Незаметная кнопка входа (футер/угол карты миров, без надписи «админ») → модалка логин+пароль → проверка `ADMIN_PASSWORD` из env (логин — константа) → закрытый роут `/admin` (server-side check) + `GET /api/admin/stats`: счётчики посещений, классы/задания, доходимость до голосового чата, средние баллы, последние события. Минималистичный UI (таблица + цифры).

**Приёмка.** Вход с правильным/неправильным паролем; пустой дашборд до событий; цифры после прогона T04; ученик кнопку не замечает (визуальная проверка).

**Blocked by:** T04 | **Status:** ready-for-agent

## T06 — Дизайн-система: DESIGN.md + яркая палитра

**Задача.** `DESIGN.md` в корне (скилл design-md): яркая детская палитра (5–9 классы), акценты по категориям секций (grammar/vocabulary/listening/speaking), токены + проза. Линт: `npx -y @google/design.md lint` (WCAG AA). Экспорт в Tailwind v4 theme и пролить на компоненты (карта миров, карточки, кнопки, Verb Bot).

**Приёмка.** `lint` без ошибок; палитра применена на 5 ключевых экранах; контраст AA; `tsc`/`build` зелёные.

**Blocked by:** — | **Status:** ready-for-agent

## T07 — Визуал: стикеры, эмодзи, стоковые иллюстрации и фото

**Задача.** Twemoji/OpenMoji стикеры на карте миров, карточках заданий, в репликах Verb Bot. Фото-фоны Pexels/Unsplash (свободные лицензии). Иллюстрации-человечки Open Peeps/Blush (в цветах палитры T06) для персонажей-помощников. Без конкретных мульт-персонажей (права).

**Приёмка.** Визуальный аудит: экраны стали ярче, ничего не ломает читаемость; `tsc`/`build` зелёные.

**Blocked by:** T06 | **Status:** ready-for-agent

## T08 — AI-маскоты: Verb Bot 2.0 + маскот карты миров

**Задача.** Сгенерировать 1–2 уникальных персонажа (не из мультиков) в фирменных цветах: обновлённый Verb Bot + маскот карты миров. Инструмент: open-design (BYOK) или бесплатный API генерации. Интеграция в UI (аватар в чате, маркер на карте).

**Приёмка.** Маскоты на проде, соответствуют палитре, весят мало (оптимизация формата).

**Blocked by:** T07 | **Status:** ready-for-agent

## T09 — Production-режим и деплой на space.z-ai

**Задача.** Проверить, можно ли переключить space.z-ai с `next dev` на `next build && next start` (`.zscripts`, конфиг платформы, build-команда). Если нельзя — задокументировать и компенсировать очередью (T03). Залить `.env` на платформу (пользователь — сам: `LLM_API_KEYS`, `LLM_MODELS`, `ADMIN_PASSWORD`). Прод-проверка всего: фронт + чат + SSE + аналитика + админ.

**Приёмка.** `https://m1ed663b3d70-d.space-z.ai/` — голосовой чат отвечает с телефона (эмулятор iPhone/Android), SSE работает, админ-вход работает.

**Blocked by:** T03, T05 | **Status:** ready-for-agent

## T10 — Нагрузочный тест + правки заказчицы по контенту

**Задача.** `scripts/load-test.mjs` — эмуляция 10 одновременных голосовых сессий на проде: 8 параллельных + 2 в очереди, замер TTFB, 0 ошибок. Применить присланные заказчицей правки по содержанию заданий (5 класс) + `verify-content.mjs` ALL PASSED.

**Приёмка.** Лог нагрузочного прогона без 500; verify-content зелёный; правки в контенте.

**Blocked by:** T09 | **Status:** ready-for-agent

## T11 — Уборка и документация

**Задача.** `huggingface/` — пометить DEPRECATED (или удалить по согласию); `backend/` — пометить «историческая реализация» (README-заглушка), `docs/HF_DEPLOY.md` — устарел; обновить `Status.md`, `docs/SPEC.md` (ссылка на новую фазу), README (архитектура: всё в Next.js). Удалить `NEXT_PUBLIC_WS_URL` из env-документации.

**Приёмка.** Дерево проекта отражает реальность; доки не противоречат спеке.

**Blocked by:** T10 | **Status:** ready-for-agent
