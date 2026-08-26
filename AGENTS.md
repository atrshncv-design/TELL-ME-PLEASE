# Agent guidance

This repository uses a local markdown issue tracker. Read `docs/agents/issue-tracker.md` and the relevant `.scratch/pravki-150826/` ticket before editing.

The project is a Next.js app in `frontend/` with epoch station JSON under `content/epochs/` mirrored to `frontend/public/content/epochs/` where applicable. Keep mirrored content byte-identical. Do not modify previously completed packages unless the new ticket explicitly requires it. Use small, verified edits and report blockers honestly.

<!-- autopilot:start -->
# Tell Me Please

Интерактивный тренажёр английского для школьников 5–9 классов: «эпохи» времён с секторами и станциями, экзамен по секторам, задания по классам, бот-чат и озвучка; Next.js-приложение в `frontend/`, контент — статичный JSON в `content/`.

## Команды

```bash
cd frontend && npx tsc --noEmit   # проверка типов, обязательна, 0 ошибок
cd frontend && npm run build      # прод-сборка next build, обязательна к приёмке
cd frontend && npm run dev:local  # dev-сервер next dev --turbopack (HMR)
cd frontend && npm run dev        # НЕ watch: это next build && next start -p 3000
cd frontend && npm run lint       # eslint
node scripts/verify-epoch.mjs     # валидация content/epochs/*/index.json из корня репо
node scripts/verify-content.mjs   # валидация контента заданий из корня репо
```

Порт 3000 на этой машине часто занят другим проектом — если занят, запускайте с другим портом (`next start -p 3001` / `PORT=…`).

## Структура

- `frontend/` — всё приложение: `src/app` (App Router), `src/components`, `src/lib` (хуки и чистая логика), `src/server` (серверные модули чата), `src/types`.
- Маршруты: `/epoch/[slug]/[sector]/[stationId]`, `/exam/[sector]/[stationId]`, `/class/[grade]/sections/[section]/[taskId]`, плюс `/mission`, `/memes`, `/music`, `/admin`; у каждой станции свой `TaskRenderer.tsx`.
- API: `/api/chat/stream` (SSE-стрим LLM), `/api/tts`, `/api/event`, `/api/admin/auth` — контракты не менять без явного требования таска.
- `content/epochs/<время>/<a1|a2|b1|b2>/station-*.json` + `index.json`; `content/exam/sector-*`; `content/tasks/grade_5..9` — зеркало `frontend/public/content/` (страницы делают `fetch('/content/…')`), правки вносить в ОБЕ копии, байт-в-байт.
- `.zscripts/{build,dev,start}.sh` — деплой-скрипты платформы space.z-ai (standalone-сборка, тарболл).
- `scripts/normalize.mjs` — канонический нормализатор тасков; его копия живёт в `frontend/src/lib/normalize.mjs`.
- Корневые каталоги `ПАК *`, `правки *`, `Задания АНГЛ` — исходные материалы пакетов, не код; завершённые пакеты не трогать.
- Тикеты прогонов: `.scratch/<фича>/issues/`, спеки — `.autopilot/<прогон>/`.

## Ключевые файлы

- `frontend/src/lib/useSound.ts` — речевой гейт: `isSpeechAllowed()`, `subscribeToSpeechGate(h)`, `SOUND_GATE_EVENT="tmp-sound-gate-change"`; коллизии UI: `EPOCH_THEORY_OPEN_EVENT="tmp-epoch-theory-open"`, `reportEpochTheoryOpen(open)`, `isEpochTheoryOpen()`, `useSoundToggle() -> {enabled, toggle}`.
- `frontend/src/components/tasks/verdict.ts` — визуал вердикта: `WRONG_HOLD_MS=1800`, `CORRECT_ADVANCE_MS=900`, `advanceDelayMs(correct)`, `optionVerdictStyle({checked,isCorrect,isSelected,answeredCorrectly})`, `CORRECT_ANSWER_PREFIX`; эталон паттерна — QuizTask.
- `frontend/src/components/BotChatModal.tsx` + `VerbBot.tsx` — флоат-бот и окно чата; `BotChatModal({ onClose })`, маунт управляет жизненным циклом сессии; чат — POST `/api/chat/stream` c `branch_id="verb_bot"`, персона передаётся в task_context; say/speakText бота не менять.
- `frontend/src/components/EpochTheory.tsx` репортит open/close (счётчик экземпляров); `SoundToggle.tsx` только читает хук; `TaskHeader.tsx` — пропсы title/backHref, кнопке shrink-0/whitespace-nowrap, h1 min-w-0+truncate.
- `frontend/src/lib/epoch.ts` — чистые функции карты эпохи; прогресс станций пишется стандартным saveTask в `tmp_progress_grade_N` (ключ класса из grade сектора через `sectorGradeKey`).
- `frontend/src/lib/useProgress.ts` — клиентский прогресс в localStorage `tmp_progress_grade_<N>`, бэкенда персистенции нет.
- Речь: `useSpeechSynthesis.ts` / `useSpeechRecognition.ts` (браузер), `useServerTts.ts` — фолбэк на `/api/tts`; оба speak-канала гейтятся централизованно, stop() немедленный по событию.
- Чат-сервер: `frontend/src/server/chat/{stream,queue,keys,prompts}.ts` + `prompts_config.json` — стрим, очередь конкурентности, список моделей с фолбэком.
- Типы таска: `frontend/src/types/task.ts`, нормализация — `frontend/src/lib/normalize-task.ts`.

## Архитектура

- Клиентское приложение поверх App Router: страницы станций fetch-ат статический JSON из `public/content/**`, механика — самодостаточный компонент из `components/tasks/*`, выбираемый TaskRenderer'ом маршрута.
- Прогресс и энергия — только localStorage браузера; сервер ничего о пользователе не хранит, кроме append-лога событий `frontend/data/events.jsonl` через `/api/event`.
- Чат: POST `/api/chat/stream` → SSE через `server/chat` (очередь, ротация моделей по ключам), ветка branch_id выбирает промпт-персону.
- Озвучка: сначала браузерный SpeechSynthesis, при отсутствии голосов — `/api/tts` (npm edge-tts, WebSocket Microsoft, без ключей); всё глушится единым звук-гейтом.
- Сборка/деплой: `output:'standalone'`; `.zscripts/build.sh` собирает тарболл ≤50MB (start.sh + Caddyfile + next-service-dist), платформа запускает `node server.js` на :3000.

## Соглашения кода

- Комментарии на русском, объясняют намерение, а не механику; без необходимости не добавлять.
- Новая зависимость = верни BLOCKED с обоснованием, пакеты самому не ставить.
- Имена констант-событий с префиксом `tmp-`; стилистика — Tailwind 4 утилиты в JSX, framer-motion для анимаций.
- Зеркала контента править синхронно и побайтово идентично; серверные контракты `/api/*` и `content/` не трогать без прямого указания таска.

## Окружение

Переменные (только имена, значений не знать и не писать): `LLM_API_BASE`, `LLM_MODEL`, `LLM_MODELS`, `LLM_API_KEYS`, `LLM_QUEUE_MAX`, `LLM_QUEUE_TIMEOUT`, `EVENTS_FILE`, `ADMIN_PASSWORD`, `ADMIN_LOGIN`; платформа передаёт `BUILD_ID` в build.sh.

## Тесты

Автотестов нет; приёмка таска = `npx tsc --noEmit` 0 ошибок + успешный `npm run build` + ручная проверка поведения по критериям таска (шов проверок — публичные поверхности компонентов: клик, тумблер, выбор варианта); контент валидируется `scripts/verify-*.mjs`.

## Подводные камни

- Порт 3000 часто занят другим проектом машины.
- Standalone-сборка не содержит `.next/static` — копировать из `frontend/.next/static` (чинилось в `.zscripts/build.sh`, там громкий FATAL-чек на chunks).
- Установленный Next.js отличается от обучающих данных — перед кодом читать доки в `frontend/node_modules/next/dist/docs/` (требование `frontend/AGENTS.md`).
- Лимит деплой-тарболла 50MB: file-tracing затягивал skills/ и вложенный клон репо — исключено через `outputFileTracingExcludes`, лишнее вычищается в build.sh.
- Тихий `|| true` на копировании статики давал пустой экран после Publish — такие места в скриптах теперь падают громко; не возвращать тихие фолбэки.
- `npm run dev` делает прод-сборку, а не watch — для итераций `npm run dev:local`.

## Как здесь работает Autopilot

- Прогон = каталог `.autopilot/<прогон>/` со spec/interfaces; задачи — тикеты в `.scratch/<фича>/issues/` со строками `Status:` и `Blocked by:`, порядок нумерации = порядок зависимостей.
- Перед редактированием читать `docs/agents/issue-tracker.md` и тикет текущего прогона (например `.scratch/pravki-150826/`); статус тикета обновлять по факту работы.
- Блокеры сообщать честно и сразу; границы модулей и «НЕ ТРОГАТЬ» из spec/interfaces обязательны.
<!-- autopilot:end -->
