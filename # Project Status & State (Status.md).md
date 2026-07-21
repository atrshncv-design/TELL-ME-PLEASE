# Project Status & State (Status.md)
**Проект:** Интерактивная платформа «TELL ME PLEASE»
**Статус:** ✅ PRODUCTION READY / MVP COMPLETED

## 1. Финальный статус
Все этапы разработки завершены. Платформа готова к сборке продакшен-версии.

## 2. Стек технологий
- **Frontend**: Next.js 16 (App Router) + TailwindCSS + Framer Motion
- **Backend**: Python 3.10+ + FastAPI + httpx + websockets
- **LLM**: OpenCode Zen (`deepseek-v4-flash-free`), stream=True
- **TTS**: Kokoro-FastAPI (Docker), голос af_bella
- **STT**: Web Speech API (нативный браузерный API)

## 3. Реализованные функции
- WebSocket-чат с AI-аватаром (`/ws/chat`)
- Ротация API-ключей при ошибках 429/403
- Хардкод-промпты для классов 5-9 (State Machine)
- Скользящее окно контекста (12 реплик)
- Sentence Buffer (агрегация токенов по .! ?)
- Streaming TTS через Kokoro-FastAPI (asyncio.create_task)
- Защита от эха (mute микрофона при воспроизведении)
- Таймер сессии 3 минуты + Final Feedback
- Graceful Shutdown с экраном завершения

## 4. Запуск
```bash
docker compose up -d                    # TTS
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload
cd frontend && npm install && npm run dev
```
