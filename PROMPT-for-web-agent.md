# 🤖 ПРОМПТ ДЛЯ ВЕБ-АГЕНТА Z.AI

**Куда:** веб-версия z.ai (чат с агентом-разработчиком)
**Что сделать:** скопируй текст ниже в чат веб-агента и нажми отправить.

---

## Скопируй этот текст ↓↓↓

Я подключил к этой сессии репозиторий GitHub: **atrshncv-design/TELL-ME-PLEASE**

Это интерактивная голосовая платформа для изучения английского школьниками 5–9 классов. Стек: **Next.js 16 (App Router, Turbopack) фронтенд + FastAPI/WebSocket бэкенд + Kokoro TTS в Docker + OpenCode Zen как LLM**.

Твоя задача — **развернуть проект ЦЕЛИКОМ: и фронтенд, и бэкенд (включая WebSocket и Kokoro TTS), и подготовить к деплою кнопкой Deploy**. Не меняй бизнес-логику и UI — только разверни зависимости, подними оба сервиса, проверь, что всё собирается и работает end-to-end, и обеспечь готовность.

Я знаю, что у тебя есть возможность размещать у себя и бэкенд-процессы (FastAPI/WS), и Docker-контейнеры (Kokoro TTS) — поэтому ТРЕБУЮ полного развёртывания, не только статики.

### Пошаговый план:

1. **Прочитай документацию проекта:**
   - `START.md` — точка входа
   - `DEPLOY.md` — полная инструкция по окружению (используй как референс всех переменных и портов)
   - `# Architecture Specification.md` и `# Product Requirements Document (PRD).md` — что это за продукт
   - `docs/SPEC.md` — что уже реализовано (MVP 5 класса готов)
   - `backend/app/main.py` — структура бэкенда (маршруты `/health`, `/ws/chat`, `/api/event`, `/admin/status`)
   - `backend/app/services/` — key_rotation, prompt_router, context_window, tts (Kokoro клиент), analytics (SQLite)

2. **Подними TTS Kokoro (Docker):**
   ```
   docker compose up -d
   ```
   Проверь: `curl http://localhost:8880/health` → должен вернуть `{"status":"healthy"}`. Если Docker недоступен — сообщи мне, не продолжай (TTS обязателен для голоса).

3. **Подними бэкенд FastAPI:**
   ```
   cd backend
   python3 -m venv venv && source venv/bin/activate
   pip install -r requirements.txt
   ```
   Создай `backend/.env` из `.env.example` и заполни:
   - `LLM_API_KEYS` — мне нужно будет дать тебе ключи OpenCode Zen, либо оставь `key1,key2` плейсхолдером (тогда LLM-звено будет 403, но бэкенд поднимется)
   - `LLM_MODEL=ling-3.0-flash-free`
   - `LLM_MODELS=ling-3.0-flash-free,nemotron-3-ultra-free`
   - `TTS_URL=http://localhost:8880/v1/audio/speech` (или публичный URL Kokoro, если он не на localhost)
   - `TTS_VOICE=af_bella`
   - `ADMIN_PASSWORD=выбери_пароль`
   - `SESSION_TIMEOUT=180`
   Запусти: `uvicorn app.main:app --port 8000`
   Проверь: `curl http://localhost:8000/health` → `{"status":"ok"}`

4. **Установи зависимости фронтенда:**
   ```
   cd frontend && npm install
   ```

5. **Создай `frontend/.env.local`** с РЕАЛЬНЫМИ публичными URL бэкенда (которые ты выдал бэкенду при развёртывании). Переменные должны быть public (префикс `NEXT_PUBLIC_`), потому что фронт обращается к ним из браузера:
   ```
   NEXT_PUBLIC_WS_URL=wss://<твой-публичный-URL-бэкенда>/ws/chat
   NEXT_PUBLIC_API_BASE=https://<твой-публичный-URL-бэкенда>
   ```
   Если бэкенд и Kokoro размещены на разных URL — `TTS_URL` в `backend/.env` должен указывать на публичный URL Kokoro, а не на localhost.

6. **Проверь сборку фронтенда:**
   ```
   cd frontend && npm run build
   ```
   Должно завершиться без ошибок. Все маршруты должны собраться: `/`, `/class`, `/class/[grade]/sections`, `/class/[grade]/sections/[section]/[taskId]`.

7. **Проверь типы:**
   ```
   cd frontend && npx tsc --noEmit
   ```
   Должно быть 0 ошибок.

8. **Проверь контент:**
   ```
   node scripts/verify-content.mjs
   ```
   Должно вывести «✅ ALL PASSED» (16 заданий grade_5 валидны).

9. **Проверь связку end-to-end** (если есть LLM-ключи):
   - WebSocket `/ws/chat` должен принимать init `{branch_id, task_id, task_context}` и отвечать токенами + аудио
   - HTTP `POST /api/event` должен принимать события воронки
   - `/admin/status` под Basic Auth должен возвращать event_count

10. **Если что-то не собирается** — исправь ТОЛЬКО конфигурационные/сборочные проблемы (зависимости, пути, конфиги сборки, порты, переменные окружения под твою инфраструктуру). **Не трогай** компоненты UI, промпты LLM, JSON-контент заданий или бизнес-логику. Если проблема в бизнес-логике — остановись и сообщи мне.

11. **По завершении** — отчитайся: какие URL получил фронт/бэк/Kokoro, какие переменные в `.env`/`.env.local` ты прописал, что проверено, и подтверди готовность к нажатию кнопки Deploy. Если LLM-ключей не было — явно скажи, что голос не тестировался, но тракт готов.

### Важные ограничения проекта (НЕ нарушать):

- **Запрещён server-side STT** (Whisper на бэкенде) — только Web Speech API в браузере.
- **Запрещена динамическая генерация промптов LLM** — все промпты hardcoded в `backend/app/prompts_config.json` по `branch_id`/`task_id`.
- **Запрещена утечка API-ключей** на фронтенд — все запросы к LLM проксируются через FastAPI.
- **Обязателен streaming pipeline** — токены LLM → sentence buffer → Kokoro TTS → WebSocket → AudioContext на клиенте.
- **Пароли и ключи — только в `.env`** (gitignored), никогда в коде.

### Что уже сделано (MVP 5 класса — не сломай):

- ✅ 16 заданий 5 класса рендерятся (quiz/fill-in/drag-drop/ladder/build-sentence/voice-chat)
- ✅ Голосовой тракт: STT в браузере → WS → LLM (ling + nemotron fallback) → TTS Kokoro → воспроизведение
- ✅ 3-минутный финал с обратной связью по ошибкам
- ✅ Прогресс в localStorage (бейджи на заданиях)
- ✅ Анонимная аналитика воронки (SQLite на бэкенде)
- ✅ HTTP Basic Auth на `/admin/*`
- ✅ Mobile-first (viewport meta + 100dvh)

### Контекст для развёртывания:

Главный бэкенд-процесс — это FastAPI на порту 8000 (WebSocket `/ws/chat`, HTTP `/api/event`, `/admin/status`). Kokoro TTS — Docker на порту 8880. Фронтенд — Next.js на порту 3000. **Я ожидаю, что ты поднимешь все три у себя и выдашь им публичные HTTPS URL**, после чего пропишешь URL бэкенда в `frontend/.env.local` как `NEXT_PUBLIC_WS_URL` (wss://) и `NEXT_PUBLIC_API_BASE` (https://), а в `backend/.env` пропишешь публичный URL Kokoro в `TTS_URL`. Если у тебя есть ограничения по портам/Docker — сообщи заранее, не молчи.

Начинай.

---

## ↑↑↑ конец текста для копирования

### После того как веб-агент развернёт проект:

1. **Я (ZCode-агент) продолжаю править код локально** и пушил изменения в `https://github.com/atrshncv-design/TELL-ME-PLEASE`.
2. **Ты** в веб-версии z.ai просишь агента «pull from GitHub и обновить» (промпт-обновление ниже).
3. **Ты** жмёшь кнопку Deploy.

### Промпт для обновления кода в веб-версии (когда я запушу новые коммиты):

> Я обновил код в репозитории atrshncv-design/TELL-ME-PLEASE. Сделай `git pull origin main`, переустанови зависимости если нужно (`cd frontend && npm install`), проверь `npm run build` и `npx tsc --noEmit`, и сообщи готовность к деплою.
