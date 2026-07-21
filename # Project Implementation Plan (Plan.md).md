# Project Implementation Plan (Plan.md)
**Проект:** Интерактивная платформа «TELL ME PLEASE»
**Статус:** ✅ Платформа полностью готова

## Инструкция для ИИ-агентов
1. Перед началом работы сверьтесь с текущим этапом.
2. Выполняйте задачи строго последовательно.
3. По завершении задачи обновляйте файл `Status.md` и ставьте отметку `[x]` в этом файле.

---

## Этап 1: Scaffolding и Базовая Инфраструктура
- [x] 1.1. Инициализация монорепозитория (папки `/frontend` и `/backend`).
- [x] 1.2. Настройка бэкенда: Python-окружение, FastAPI, Uvicorn, httpx, websockets.
- [x] 1.3. Настройка фронтенда: Next.js (App Router), TailwindCSS, Framer Motion.
- [x] 1.4. Настройка линтеров и форматтеров.

## Этап 2: Разработка Backend-ядра (Python + FastAPI)
- [x] 2.1. Создание WebSocket-сервера на FastAPI (`/ws/chat`).
- [x] 2.2. Реализация **Key Rotation Manager** (ротация ключей при 429/403).
- [x] 2.3. Создание `prompts_config.json` с хардкод-промптами для 5–9 классов.
- [x] 2.4. Разработка **State Machine** (маршрутизатор `branch_id` → промпт).
- [x] 2.5. Реализация **Context Window** (скользящее окно 12 реплик).
- [x] 2.6. Разработка **Sentence Buffer** (агрегация токенов в предложения по .! ?).

## Этап 3: Интеграция LLM и TTS (Streaming Pipeline)
- [x] 3.1. `docker-compose.yml` для Kokoro-FastAPI (CPU, порт 8880).
- [x] 3.2. Модуль `tts.py` — async POST-запрос к Kokoro, base64 mp3, голос af_bella.
- [x] 3.3. Overlapping Execution: `asyncio.create_task` для TTS в фоне.
- [x] 3.4. Отправка аудио клиенту: `{"type": "audio", "content": "<base64>"}`.

## Этап 4: Разработка Frontend (UI/UX)
- [x] 4.1. Верстка Layout: Главная (Welcome), Выбор класса (5-9), Выбор раздела.
- [x] 4.2. Экран "AI Avatar Chat" с анимациями (Framer Motion).
- [x] 4.3. WebSocket-клиент на фронтенде (хук useWebSocket).

## Этап 5: Голосовой ввод и вывод (Web API)
- [x] 5.1. Интеграция Web Speech API (STT) на клиенте (хук useSpeechRecognition).
- [x] 5.2. Очередь воспроизведения base64-аудио (хук useAudioPlayer).
- [x] 5.3. Защита от эха: mute микрофона при воспроизведении аудио.

## Этап 6: Бизнес-логика сессии и Тестирование
- [x] 6.1. Таймер сессии 3 минуты (asyncio.sleep на сервере, setInterval на клиенте).
- [x] 6.2. Триггер Final Feedback: финальный промпт с анализом ошибок и прощанием.
- [x] 6.3. Graceful Shutdown: финальное аудио → session_ended → экран завершения.
