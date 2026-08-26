# time travel mission  
  
**Voice-first English practice for grades 5–9 with an AI conversation partner.**  
  
[status](https://img.shields.io/badge/status-MVP-yellow)   
[Next.js](https://img.shields.io/badge/Next.js-16-black)   
[TypeScript](https://img.shields.io/badge/TypeScript-5-blue)   
[Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8)  
  
An interactive platform where students practise spoken English by talking to an AI avatar (Verb Bot) that listens, replies, and speaks back. The curriculum is organised as a game world: 12 tense-epochs, four difficulty sectors per epoch (A1–B2), and a final exam — alongside grammar, vocabulary, listening and speaking tasks across 16+ mechanics.  
  
## Overview  
  
time travel mission is built around a simple insight: speaking practice happens through dialogue, not worksheets. The student speaks into the microphone (push-to-talk), the AI replies with streaming text and spoken audio, and the conversation is wrapped in a 180-second session with closing feedback from the AI — short enough to fit a classroom rhythm. The same platform delivers the full grammar curriculum as game missions, with progress, currencies, achievements and a story-driven Verb Bot.  
  
## The problem  
  
In a regular classroom a student gets only seconds of speaking time per lesson. There is rarely a safe place to hold a conversation, make mistakes, and hear natural English replies; textbook exercises train grammar on paper, not speech. Personal tutors solve this but are expensive and not available to everyone.  
  
## The solution  
  
time travel mission gives every student a patient, always-available conversation partner. The AI avatar listens via browser speech recognition, answers via a streaming LLM, and speaks back via hybrid TTS — no headset hardware beyond a microphone, no scheduling. The grammar side is mapped onto the same game world: each of the 12 English tenses is an epoch with sectors A1–B2 and stations of varied task types, capped by the «Great Exam of Tenses».  
  
****Key capabilities****  

| Capability | Implementation |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Voice dialogue with an AI avatar | components/tasks/VoiceChatTask.tsx — push-to-talk, live chat, final feedback |
| Browser speech recognition (STT) | lib/useSpeechRecognition.ts — Web Speech API, en-US, auto-stop |
| Streaming LLM replies over SSE | app/api/chat/stream/route.ts, server/chat/stream.ts — OpenAI-compatible API (OpenCode Zen) |
| API-key rotation on 429/403 | server/chat/keys.ts |
| FIFO queue for LLM requests (rate-limit protection) | server/chat/queue.ts |
| Sliding context window (last 12 turns) | server/chat/stream.ts |
| Hybrid TTS: browser synthesis + server fallback | lib/useSpeechSynthesis.ts, lib/useServerTts.ts, app/api/tts/route.ts (edge-tts → Google translate_tts) |
| Echo protection — mic muted while the AI speaks | VoiceChatTask.tsx |
| 180-second sessions with closing feedback | VoiceChatTask.tsx + stream.ts (final / session_ended) |
| 12 tense-epochs, sectors A1–B2, final exam | content/epochs/*, app/epoch/**, app/exam/** |
| 16+ task mechanics (quiz, cloze, drag-and-drop, one-minute speech, …) | components/tasks/* |
| Gamification: energy/communication currencies, achievements, story | lib/*, components/VerbBot.tsx |
| Progress (localStorage) and events analytics | lib/useProgress.ts, app/api/event/route.ts |
  
  
## Architecture  
  
```
Browser — Next.js frontend (frontend/)
  Web Speech API: STT (push-to-talk, en-US)
  Speech synthesis (primary TTS) with sentence audio queue
  Voice session: 180 s client-side timer; mic muted while the AI speaks
       │  POST /api/chat/stream (SSE)      GET /api/tts?text=…&voice=…
       ▼
Next.js API Routes (server, single process)
  chat/stream ── FIFO queue → key rotation → LLM (OpenCode Zen)
       │         sliding window (last 12 turns), per-grade/task prompts
       └─ final=true → session_ended with closing feedback
  tts ── edge-tts → Google translate_tts fallback; LRU cache
Content: content/epochs/<tense>/… (JSON), mirrored into frontend/public/content

```
  
**Chat protocol (SSE)** — ==POST /api/chat/stream==; each event is a ==data: <json>== line:  
  
```
{"type":"token","content":"…"}              — streaming token
{"type":"done","content":"…"}               — full reply
{"type":"queued","content":"…","position":N}— waiting for an LLM slot
{"type":"error","content":"…"}              — service error
{"type":"session_ended","content":"…"}      — closing feedback (final=true)

```
  
The session is stateless on the server: the client sends the message history with every request, and ==final: true== triggers the closing feedback. This protocol is the evolution of the original WebSocket design, ported 1:1 into Next.js API Routes when the standalone backend was folded into the app.  
  
## Tech stack  
  
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, framer-motion  
- **LLM:** OpenAI-compatible streaming API — OpenCode Zen (==https://opencode.ai/zen/v1==), model fallback chain  
- **Speech:** Web Speech API (recognition + synthesis); server TTS via ==edge-tts== with Google ==translate_tts== fallback  
- **Data:** JSON content files (no database), localStorage progress, JSONL events file  
  
## Project status  
  
**MVP — a working prototype** used with real students in grades 5–9. The full loop runs: curriculum, voice dialogue, gamification, admin panel, analytics. It is not yet a finished commercial product — see Limitations.  
  
## My contribution  
  
- Designed the system architecture: client–server voice chat with streaming LLM responses and a TTS pipeline.  
- Implemented the backend/frontend integration and the chat protocol — originally a FastAPI + WebSocket backend, later ported 1:1 into Next.js API Routes with SSE.  
- Built the TTS pipeline (sentence-level audio queue, hybrid browser/server synthesis), the API-key rotation and the rate-limit queue.  
  
## Quick start  
  
Requirements: Node.js 20+, npm.  
  
```
git clone git@github.com:atrshncv-design/TELL-ME-PLEASE.git
cd TELL-ME-PLEASE/frontend
npm install
cp .env.example .env      # then fill in LLM_API_KEYS and ADMIN_PASSWORD
npm run dev               # http://localhost:3000  (project convention: next start -p 3000)
# hot-reload development:
npm run dev:local         # next dev --turbopack

```
  
The whole app runs as one Next.js server: the LLM chat endpoint (==/api/chat/stream==) and the TTS endpoint (==/api/tts==) live inside it, so no separate backend process is required. TTS works without any keys; the AI chat needs at least one value in ==LLM_API_KEYS==.  
  
## Configuration  
  
Environment variables (names only; see ==frontend/.env.example== — never commit real values):  

| Variable | Purpose |
| --------------------------- | ----------------------------------------------------------- |
| LLM_API_KEYS | Comma-separated API keys, rotated on 429/403 |
| LLM_API_BASE | OpenAI-compatible API base URL (default: OpenCode Zen) |
| LLM_MODELS | Models in priority order; empty reply → next model |
| LLM_QUEUE_MAX | Max concurrent LLM requests (default 8) |
| LLM_QUEUE_TIMEOUT | Queue wait timeout in ms (default 30000) |
| ADMIN_LOGIN, ADMIN_PASSWORD | Credentials for the hidden admin panel |
| EVENTS_FILE | JSONL path for analytics events (default data/events.jsonl) |
  
  
## Limitations  
  
- **Speech recognition is browser-dependent** (Web Speech API). Chrome, Edge and Safari are supported; in browsers without English recognition (e.g. Yandex Browser) playback falls back to server-side TTS, and dictation quality ultimately depends on the browser engine, microphone and environment.  
- **External API dependency:** AI replies require OpenCode Zen keys configured on the server. Free-tier models can occasionally return empty responses — mitigated by the model fallback chain and the request queue.  
- **3-minute sessions** are a deliberate design decision for classroom pacing, not a bug.  
- **No database:** progress lives in localStorage and analytics in a local JSONL file; both are lost when the cache or container is recreated.  
- The original standalone FastAPI backend and Docker Compose setup were removed; everything now runs inside the Next.js server.  
  
## Roadmap  
  
- Content expansion for grades 5–9 per the client curriculum materials (the 12 tense-epochs and the final exam are already in place).  
- Hardening speech recognition and multi-browser voice support.  
- Deployment and operations guide: ==docs/DEPLOY-PROMPT.md==.  
  
## License  
  
No license specified.  
⸻  
# time travel mission  
  
**Голосовая практика английского языка для 5–9 классов с AI-аватаром.**  
  
[status](https://img.shields.io/badge/status-MVP-yellow)   
[Next.js](https://img.shields.io/badge/Next.js-16-black)   
[TypeScript](https://img.shields.io/badge/TypeScript-5-blue)   
[Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8)  
  
Интерактивная платформа, где ученик практикует разговорный английский, общаясь с AI-аватаром (Verb Bot), который слушает, отвечает и озвучивает реплики. Учебная программа устроена как игровой мир: 12 эпох-времён, в каждой — четыре сектора сложности (A1–B2) со станциями, плюс финальный экзамен. Параллельно — грамматические, лексические, аудио- и разговорные задания более чем 16 механик.  
  
## Обзор  
  
Идея time travel mission простая: разговорной практике нужен диалог, а не рабочие листы. Ученик говорит в микрофон (push-to-talk), AI отвечает стримингом текста и голоса, а беседа укладывается в сессию 180 секунд с итоговой обратной связью от бота — коротко, чтобы вписаться в ритм урока. На той же платформе работает вся грамматическая программа в виде игровых миссий: прогресс, валюты, достижения и сюжетный Verb Bot.  
  
## Проблема  
  
На обычном уроке ученик говорит считанные секунды. Места, где можно спокойно вести диалог, ошибаться и слышать живые ответы на английском, почти нет; упражнения в учебнике тренируют грамматику на бумаге, а не речь. Репетитор решает проблему, но доступен не всем.  
  
## Решение  
  
time travel mission даёт каждому ученику терпеливого собеседника, который доступен всегда. Аватар слушает через браузерное распознавание речи, отвечает через стриминговую LLM и озвучивает ответы гибридным TTS — нужен только микрофон, никакого расписания. Грамматика упакована в тот же игровой мир: каждое из 12 английских времён — эпоха с секторами A1–B2 и станциями разных типов, а венчает всё «Великий Экзамен Времён».  
  
****Ключевые возможности****  

| Возможность | Реализация |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Голосовой диалог с AI-аватаром | components/tasks/VoiceChatTask.tsx — push-to-talk, живой чат, финальный фидбек |
| Распознавание речи в браузере (STT) | lib/useSpeechRecognition.ts — Web Speech API, en-US, автостоп |
| Стриминг ответов LLM по SSE | app/api/chat/stream/route.ts, server/chat/stream.ts — OpenAI-совместимый API (OpenCode Zen) |
| Ротация API-ключей при 429/403 | server/chat/keys.ts |
| FIFO-очередь LLM-запросов (защита от rate-limit) | server/chat/queue.ts |
| Скользящее окно контекста (последние 12 реплик) | server/chat/stream.ts |
| Гибридный TTS: браузерный синтез + серверный фолбэк | lib/useSpeechSynthesis.ts, lib/useServerTts.ts, app/api/tts/route.ts (edge-tts → Google translate_tts) |
| Защита от эха — микрофон на паузе, пока говорит бот | VoiceChatTask.tsx |
| Сессии 180 секунд с итоговым фидбеком | VoiceChatTask.tsx + stream.ts (final / session_ended) |
| 12 эпох-времён, секторы A1–B2, финальный экзамен | content/epochs/*, app/epoch/**, app/exam/** |
| 16+ механик заданий (quiz, cloze, drag-and-drop, one-minute и др.) | components/tasks/* |
| Геймификация: валюты ⚡/🗣, достижения, сюжет | lib/*, components/VerbBot.tsx |
| Прогресс (localStorage) и аналитика событий | lib/useProgress.ts, app/api/event/route.ts |
  
  
## Архитектура  
  
```
Браузер — фронтенд Next.js (frontend/)
  Web Speech API: STT (push-to-talk, en-US)
  Синтез речи (основной TTS) с очередью предложений
  Голосовая сессия: таймер 180 с на клиенте; микрофон на паузе, пока говорит бот
       │  POST /api/chat/stream (SSE)      GET /api/tts?text=…&voice=…
       ▼
API-роуты Next.js (сервер, один процесс)
  chat/stream ── FIFO-очередь → ротация ключей → LLM (OpenCode Zen)
       │         скользящее окно (12 реплик), промпты по классу/заданию
       └─ final=true → session_ended с итоговым фидбеком
  tts ── edge-tts → фолбэк Google translate_tts; LRU-кэш
Контент: content/epochs/<tense>/… (JSON), зеркалится в frontend/public/content

```
  
**Протокол чата (SSE)** — ==POST /api/chat/stream==; каждое событие — строка ==data: <json>==:  
  
```
{"type":"token","content":"…"}               — токен стриминга
{"type":"done","content":"…"}                — полный ответ
{"type":"queued","content":"…","position":N} — ожидание слота LLM
{"type":"error","content":"…"}               — ошибка сервиса
{"type":"session_ended","content":"…"}       — итоговый фидбек (final=true)

```
  
Сессия на сервере не хранится: клиент присылает историю сообщений с каждым запросом, а ==final: true== запускает финальную обратную связь. Это эволюция исходного WebSocket-протокола: при переносе бэкенда внутрь Next.js он был портирован 1:1 в API-роуты.  
  
## Технологический стек  
  
- **Фронтенд:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, framer-motion  
- **LLM:** OpenAI-совместимый стриминговый API — OpenCode Zen (==https://opencode.ai/zen/v1==), цепочка фолбэк-моделей  
- **Речь:** Web Speech API (распознавание и синтез); серверный TTS на ==edge-tts== с фолбэком Google ==translate_tts==  
- **Данные:** JSON-файлы контента (без БД), прогресс в localStorage, события в JSONL  
  
## Статус проекта  
  
**MVP — рабочий прототип**, используется с реальными учениками 5–9 классов. Работает весь контур: программа, голосовой диалог, геймификация, админ-панель, аналитика. До готового коммерческого продукта ещё есть дистанция — см. ограничения.  
  
## Мой вклад  
  
- Спроектировал архитектуру системы: клиент-серверный голосовой чат со стримингом LLM и TTS-конвейером.  
- Реализовал интеграцию бэкенда и фронтенда и протокол чата — изначально FastAPI + WebSocket, позже портирован 1:1 в API-роуты Next.js с SSE.  
- Собрал TTS-конвейер (пофразовая аудиоочередь, гибридный браузерный/серверный синтез), ротацию API-ключей и очередь защиты от rate-limit.  
  
## Быстрый старт  
  
Требования: Node.js 20+, npm.  
  
```
git clone git@github.com:atrshncv-design/TELL-ME-PLEASE.git
cd TELL-ME-PLEASE/frontend
npm install
cp .env.example .env      # заполнить LLM_API_KEYS и ADMIN_PASSWORD
npm run dev               # http://localhost:3000  (конвенция проекта: next start -p 3000)
# разработка с hot-reload:
npm run dev:local         # next dev --turbopack

```
  
Всё приложение работает как один Next.js-сервер: эндпоинт чата (==/api/chat/stream==) и TTS (==/api/tts==) живут внутри него — отдельный бэкенд-процесс не нужен. TTS работает без ключей; для AI-чата нужен хотя бы один ключ в ==LLM_API_KEYS==.  
  
## Конфигурация  
  
Переменные окружения (только имена; см. ==frontend/.env.example== — реальные значения не коммитить):  

| Переменная | Назначение |
| --------------------------- | --------------------------------------------------------------- |
| LLM_API_KEYS | API-ключи через запятую, ротация при 429/403 |
| LLM_API_BASE | Базовый URL OpenAI-совместимого API (по умолчанию OpenCode Zen) |
| LLM_MODELS | Модели в порядке приоритета; пустой ответ → следующая |
| LLM_QUEUE_MAX | Максимум одновременных LLM-запросов (по умолчанию 8) |
| LLM_QUEUE_TIMEOUT | Таймаут ожидания в очереди, мс (по умолчанию 30000) |
| ADMIN_LOGIN, ADMIN_PASSWORD | Доступ к скрытой админ-панели |
| EVENTS_FILE | Путь к JSONL-файлу событий (по умолчанию data/events.jsonl) |
  
  
## Ограничения  
  
- **Распознавание речи зависит от браузера** (Web Speech API). Поддерживаются Chrome, Edge и Safari; в браузерах без английского распознавания (например, Яндекс-браузер) озвучка переключается на серверный TTS, а качество распознавания в любом случае определяется движком браузера, микрофоном и окружением.  
- **Зависимость от внешнего API:** для ответов AI нужны ключи OpenCode Zen на сервере. Бесплатные модели иногда возвращают пустой ответ — это смягчается цепочкой фолбэк-моделей и очередью запросов.  
- **Сессии по 3 минуты** — осознанное решение под ритм урока, а не баг.  
- **Нет базы данных:** прогресс хранится в localStorage, аналитика — в локальном JSONL-файле; оба сбрасываются при очистке кэша или пересоздании контейнера.  
- Отдельный FastAPI-бэкенд и Docker Compose удалены — всё работает внутри Next.js-сервера.  
  
## План развития  
  
- Расширение контента для 5–9 классов по материалам заказчика (12 эпох-времён и финальный экзамен уже реализованы).  
- Укрепление распознавания речи и голосовой поддержки в разных браузерах.  
- Гайд по деплою и эксплуатации: ==docs/DEPLOY-PROMPT.md==.  
  
## Лицензия  
  
Лицензия не указана.  
