# Tell Me Please

Интерактивная платформа для изучения английского языка учащимися 5-9 классов с AI-аватаром для голосового общения.

## Архитектура

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                │
│  Web Speech API (STT) ←→ WebSocket ←→ Audio Queue   │
└──────────────────────┬──────────────────────────────┘
                       │ ws://localhost:8000/ws/chat
┌──────────────────────┴──────────────────────────────┐
│                   Backend (FastAPI)                  │
│  Key Rotation → LLM Streaming → Sentence Buffer     │
│                     ↓                               │
│              TTS (Kokoro-FastAPI)                    │
└─────────────────────────────────────────────────────┘
```

**Компоненты:**
- **STT**: Web Speech API (нативный браузерный API, без серверной нагрузки)
- **LLM**: OpenCode Zen (`deepseek-v4-flash-free`), стриминг через SSE
- **TTS**: Kokoro-FastAPI (OpenAI-совместимый API, голос `af_bella`)
- **Ключи**: Циклическая ротация API-ключей при ошибках 429/403

## Быстрый запуск

### 1. TTS-сервер (Docker)

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend

# Создайте виртуальное окружение
python3 -m venv venv
source venv/bin/activate

# Установите зависимости
pip install -r requirements.txt

# Настройте API-ключи (через запятую)
echo "OPENCODE_API_KEYS=your_key_1,your_key_2" > .env

# Запустите сервер
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend

```bash
cd frontend

# Установите зависимости
npm install

# Запустите в режиме разработки
npm run dev
```

### 4. Проверка

Откройте `http://localhost:3000` в браузере.

## Протокол WebSocket

```
Клиент → Сервер:
  {"branch_id": "5"}          — при подключении
  {"text": "Hello teacher"}   — речь пользователя

Сервер → Клиент:
  {"type": "token", "content": "H"}           — токен
  {"type": "sentence", "content": "Hello."}   — предложение (готово для TTS)
  {"type": "audio", "content": "<base64>"}    — аудио от Kokoro
  {"type": "done"}                             — ответ завершён
  {"type": "session_ended"}                    — таймер 180 сек
```

## Структура проекта

```
TELL ME PLEASE/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI + WebSocket + Sentence Buffer
│   │   ├── prompts_config.json  # Хардкод-промпты для 5-9 классов
│   │   └── services/
│   │       ├── key_rotation.py  # Ротация API-ключей
│   │       ├── prompt_router.py # branch_id → промпт
│   │       ├── context_window.py# Скользящее окно 12 реплик
│   │       └── tts.py           # Async TTS-клиент
│   ├── requirements.txt
│   └── .env                     # OPENCODE_API_KEYS=...
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Главный экран
│   │   │   ├── class/           # Выбор класса
│   │   │   └── chat/            # Экран чата с AI-аватаром
│   │   └── lib/
│   │       ├── useWebSocket.ts  # WebSocket client
│   │       ├── useSpeechRecognition.ts  # Web Speech API
│   │       └── useAudioPlayer.ts        # Очередь аудио
│   └── package.json
├── docker-compose.yml           # Kokoro-FastAPI
└── README.md
```

## Ключевые особенности

- **Защита от эха**: Микрофон ставится на паузу во время воспроизведения аудио
- **Таймер сессии**: 3 минуты, с финальным обратной связью от AI
- **Скользящее окно**: 12 реплик для экономии токенов (200K лимит)
- **Ротация ключей**: Автоматическое переключение при ошибках лимитов
