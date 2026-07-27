# 🛠️ DEPLOY — полная инструкция по локальному развёртыванию

Цель: запустить **полный стек** (фронт + бэкенд + LLM + TTS) на локальной машине за ~15 минут.

## Требования к окружению

| Компонент | Версия | Проверка |
|---|---|---|
| Node.js | ≥ 18 (реком. 20+) | `node --version` |
| Python | ≥ 3.9 (реком. 3.10+) | `python3 --version` |
| Docker Desktop | любой актуальный | `docker --version` |
| Git | любой | `git --version` |

Дополнительно: **Chrome или Edge** для голосовых заданий (Web Speech API; в Firefox сработает текстовый фолбэк).

---

## Шаг 1. Клонировать репозиторий

```bash
git clone https://github.com/atrshncv-design/TELL-ME-PLEASE.git
cd TELL-ME-PLEASE
```

---

## Шаг 2. TTS-сервер Kokoro (Docker)

```bash
docker compose up -d
```

Проверка (должно вернуть `{"status":"healthy"}`):
```bash
curl http://localhost:8880/health
```

> Образ `ghcr.io/remsky/kokoro-fastapi-cpu:latest` весит ~1 ГБ — первый pull займёт несколько минут.

---

## Шаг 3. Backend (FastAPI)

```bash
cd backend

# Создать виртуальное окружение
python3 -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate

# Установить зависимости
pip install -r requirements.txt

# Настроить секреты
cp .env.example .env
```

Открыть `backend/.env` и заполнить:
```env
LLM_API_KEYS=sk-твой_ключ_1,sk-твой_ключ_2     # ключи OpenCode Zen (через запятую)
LLM_API_BASE=https://opencode.ai/zen/v1
LLM_MODEL=ling-3.0-flash-free                  # основная модель (non-reasoning, 1.5с TTFB)
LLM_MODELS=ling-3.0-flash-free,nemotron-3-ultra-free   # primary + fallback
TTS_URL=http://localhost:8880/v1/audio/speech
TTS_VOICE=af_bella
ADMIN_PASSWORD=придумай_пароль_админа          # для /admin/* (Basic Auth)
SESSION_TIMEOUT=180                            # 3 минуты на голосовую сессию
```

**Где взять `LLM_API_KEYS`:** зарегистрируйся на [opencode.ai](https://opencode.ai), создай API-ключи в личном кабинете (раздел Zen). Бесплатный tier. Ключей можно несколько — бэкенд ротирует их при 429/403.

Запустить бэкенд:
```bash
cd backend
./venv/bin/python -m uvicorn app.main:app --port 8000 --reload
# или: source venv/bin/activate && uvicorn app.main:app --port 8000 --reload
```

Проверка:
```bash
curl http://localhost:8000/health        # → {"status":"ok"}
curl -u admin:ТВОЙ_ПАРОЛЬ http://localhost:8000/admin/status   # → {"status":"admin","event_count":N}
```

---

## Шаг 4. Frontend (Next.js 16)

```bash
cd frontend
npm install
```

Создать `frontend/.env.local`:
```env
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/chat
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

> Для продакшена по HTTPS заменить на `wss://...` и `https://...` соответственно.

Запустить дев-сервер:
```bash
npm run dev
```

Открыть в браузере (ОБЯЗАТЕЛЬНО Chrome/Edge для голоса):
```
http://localhost:3000
```

---

## Шаг 5. Проверка работоспособности

| Что | Ожидаемый результат |
|---|---|
| Главная страница | Кнопка «Начать →» |
| Выбор класса | Только «5 класс» (другие скрыты — нет контента) |
| Раздел «Грамматика» → любое задание | Задание рендерится, работает клик/ввод |
| Раздел «Свободное общение» → «Поговори со сверстником» | Кнопка микрофона 🎤, статус «онлайн», AI отвечает за 1-3 сек |
| Через 3 минуты разговора | AI прощается + даёт обратную связь |

---

## Частые проблемы

| Симптом | Причина / решение |
|---|---|
| Кнопка микрофона серая, «офлайн» | Бэкенд не запущен на :8000. Проверь `curl localhost:8000/health` |
| Кнопки микрофона нет вообще | Ты в Firefox. Используй Chrome/Edge, либо пользуйся текстовым фолбэком |
| AI отвечает абсурдом или пусто | Проверь `LLM_API_KEYS` в `.env`, возможно лимит исчерпан (429) |
| Нет звука (TTS) | Проверь Kokoro: `curl localhost:8880/health` |
| `npx tsc --noEmit` ругается | Войдёт в `frontend/` и запусти `npm install` заново |
| Ошибка CORS в консоли браузера | Бэкенд должен слушать :8000, а фронт :3000 — оба из `.env` |

---

## Команды для повторной проверки целостности

```bash
# Типы фронтенда (0 ошибок = OK)
cd frontend && npx tsc --noEmit

# Сборка фронтенда (зелёный = OK)
cd frontend && npm run build

# Контент-валидация (ALL PASSED = OK)
node scripts/verify-content.mjs
```

Все три проверки **обязаны быть зелёными** перед коммитом.

---

## Структура окружений

| Переменная | Где | Назначение |
|---|---|---|
| `LLM_API_KEYS` | `backend/.env` | Ключи OpenCode Zen (через запятую) |
| `LLM_MODEL` / `LLM_MODELS` | `backend/.env` | Модель(и) LLM (primary, fallback) |
| `TTS_URL` / `TTS_VOICE` | `backend/.env` | Kokoro endpoint + голос |
| `ADMIN_PASSWORD` | `backend/.env` | Пароль Basic Auth для `/admin/*` |
| `SESSION_TIMEOUT` | `backend/.env` | Длительность голосовой сессии (сек) |
| `NEXT_PUBLIC_WS_URL` | `frontend/.env.local` | URL WebSocket бэкенда |
| `NEXT_PUBLIC_API_BASE` | `frontend/.env.local` | URL HTTP бэкенда (для аналитики) |

**⚠️ Никогда не коммить `.env` / `.env.local` с реальными ключами.** В репо только `.env.example` (шаблоны).
