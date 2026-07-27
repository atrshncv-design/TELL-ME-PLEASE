# 🚀 TELL ME PLEASE — стартовая точка

Бесплатная интерактивная голосовая платформа для изучения английского школьниками 5–9 классов.

**Стек:** Next.js 16 (фронт) · FastAPI + WebSocket (бэкенд) · OpenCode Zen (LLM) · Kokoro TTS (Docker) · Web Speech API (STT в браузере).

## Кто ты и что тебе нужно сделать

- Если ты **человек-разработчик** → читай [`DEPLOY.md`](./DEPLOY.md) (полная инструкция по локальному запуску).
- Если ты **AI-агент в веб-версии z.ai** → читай [`PROMPT-for-web-agent.md`](./PROMPT-for-web-agent.md) (промпт для авто-развёртывания фронтенда И бэкенда).
- Если ты **хочешь понять проект** → читай [`# Product Requirements Document (PRD).md`](./#%20Product%20Requirements%20Document%20(PRD).md) и [`# Architecture Specification.md`](./#%20Architecture%20Specification.md).

## Что внутри

```
TELL ME PLEASE/
├── frontend/          # Next.js 16 + TailwindCSS + Framer Motion
│   └── src/
│       ├── app/                    # App Router: /, /class, /class/[grade]/sections/...
│       ├── components/tasks/       # 6 типов заданий (Quiz, FillIn, DragDrop, Ladder, BuildSentence, VoiceChat)
│       └── lib/                    # useWebSocket, useSpeechRecognition, useAudioPlayer, useProgress, useAnalytics
├── backend/           # FastAPI + WebSocket chat
│   ├── app/
│   │   ├── main.py                  # /health, /ws/chat, /api/event, /admin/status
│   │   ├── prompts_config.json      # hardcoded system prompts (grade_5..9 + per-task roles)
│   │   ├── core/config.py           # Settings (env-driven)
│   │   └── services/                # key_rotation, prompt_router, context_window, tts, analytics
│   ├── .env.example                 # ШАБЛОН секретов (LLM_API_KEYS, ADMIN_PASSWORD)
│   └── requirements.txt
├── content/tasks/grade_5/   # 16 заданий JSON (source of truth)
├── docker-compose.yml       # Kokoro TTS
├── docs/                    # SPEC.md, TICKETS.md
└── # *.md                   # PRD, Architecture, CLAUDE rules, TOOLS
```

## Статус (на момент пуша)

✅ **Рабочий MVP 5 класса** (16 заданий + голос + прогресс + аналитика).
⏳ Конвертация контента 6-9 классов из `.doc` методичек — следующая фаза.
⏳ UI дашборда аналитики — следующая фаза.

См. [`Status.md`](./Status.md) и [`Plan.md`](./Plan.md).
