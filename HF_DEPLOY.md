# 🤗 Deploy на Hugging Face Spaces (полностью бесплатно)

HF Spaces Docker SDK позволяет бесплатно задеплоить **весь проект целиком** в одном Docker-контейнере: FastAPI + WebSocket + встроенный Kokoro TTS. После деплоя получаем публичный HTTPS-URL вида `https://<username>-tell-me-please.hf.space`, на который натравливаем фронт.

## ⚠️ Важные ограничения HF Spaces (free tier)

| Что | Лимит |
|---|---|
| RAM | 16 ГБ |
| Диск | 50 ГБ |
| Sleep | через 48 часов неактивности (просыпается при первом запросе, ~30с) |
| Порт | **обязательно `7860`** (HF хардкод) |
| Протокол | HTTPS (WebSocket через `wss://`) |
| Стоимость | **0 ₽** |

Sleep-режим — единственная цена бесплатности. Для уроков в классе (дети открывают QR → активность) — не проблема.

---

## Что я подготовил в репозитории

1. **`huggingface/Dockerfile`** — образ с Python 3.11, FastAPI, uvicorn, httpx, kokoro-onnx, голосом `af_bella`. Один процесс обслуживает и WS, и HTTP, и TTS.
2. **`huggingface/app.py`** — стартовая точка (запускает uvicorn на `:7860`).
3. **`huggingface/README.md`** — YAML-фронтматтер для HF Space (`sdk: docker`).
4. **`huggingface/.env.example`** — список переменных для Settings Space.

См. [`huggingface/`](./huggingface/) в корне репо.

---

## Пошаговый деплой (для тебя)

### Шаг 1. Создать HF Space

1. Зарегистрируйся на https://huggingface.co (бесплатно, e-mail).
2. Нажми профиль → **New Space**.
3. Заполни:
   - **Owner:** твой username (напр. `atrshncv`)
   - **Space name:** `tell-me-please`
   - **License:** MIT
   - **SDK:** **Docker** (важно!)
   - **Hardware:** **CPU basic (Free, 16GB RAM)**
   - **Visibility:** Public
4. **Create Space**.

### Шаг 2. Загрузить код из репозитория

Вариант А — клонировать и залить с локального:

```bash
# 1. Клонируй HF Space (пустой)
git clone https://huggingface.co/spaces/USERNAME/tell-me-please hf-space
cd hf-space

# 2. Скопируй содержимое huggingface/ из проекта TELL ME PLEASE
cp -r /путь/к/TELL-ME-PLEASE/huggingface/* .
cp -r /путь/к/TELL-ME-PLEASE/backend/app ./app

# 3. Закоммить и запушь
git add .
git commit -m "Deploy TELL ME PLEASE backend + Kokoro"
git push
```

Вариант Б — через веб-интерфейс HF: загрузи файлы из `huggingface/` + папку `app/` через **Files → Add file**.

### Шаг 3. Настроить секреты

В интерфейсе HF Space: **Settings → Repository secrets → New secret**. Добавь:

| Имя | Значение |
|---|---|
| `LLM_API_KEYS` | `sk-твой_ключ_1,sk-твой_ключ_2` (OpenCode Zen, через запятую) |
| `ADMIN_PASSWORD` | пароль для `/admin/*` |

Эти переменные HF подставит в окружение контейнера автоматически. **Не коммить их в код.**

### Шаг 4. Дождаться сборки

HF увидит пуш и начнёт собирать Docker-образ (~5-10 минут первый раз, ~1 МБ скачать Kokoro-голос). Логи сборки видны во вкладке **Logs**.

### Шаг 5. Проверить

Когда статус Space станет **Running**, открой:
```
https://USERNAME-tell-me-please.hf.space/health
```
Должно вернуть `{"status":"ok"}`.

Голосовой WS:
```
wss://USERNAME-tell-me-please.hf.space/ws/chat
```

### Шаг 6. Прописать URL в фронтенде и задеплоить фронт

В `frontend/.env.local` (или `.env` для деплоя на z.ai/Vercel):
```env
NEXT_PUBLIC_WS_URL=wss://USERNAME-tell-me-please.hf.space/ws/chat
NEXT_PUBLIC_API_BASE=https://USERNAME-tell-me-please.hf.space
```

Задеплой фронт на z.ai (кнопкой Deploy) или Vercel. Текстовые задания и голос заработают с публичного URL.

---

## Почему один контейнер, а не два

В исходной архитектуре Kokoro был отдельным Docker-контейнером (`docker-compose.yml`). На HF Spaces free tier **можно поднять только один контейнер**. Решение: встроить Kokoro как Python-библиотеку (`kokoro-onnx`) прямо в FastAPI-процесс. Это проще (один деплой), быстрее (нет HTTP-перехода между бэкендом и TTS), и логически чище. Оригинальный `docker-compose.yml` сохранён для локальной разработки.

---

## Если что-то не работает

| Симптом | Причина / фикс |
|---|---|
| Space статус `Error` | Смотри вкладку **Logs** — обычно это синтаксис Python или нехватка памяти |
| `/health` 502 | Контейнер ещё собирается/загружается (Kokoro-голос ~3 сек) |
| WS не подключается | Проверь, что фронт стучится на `wss://` (не `ws://`) — HF только HTTPS/WSS |
| LLM возвращает 429 | Исчерпан лимит OpenCode Zen на одном ключе — добавь ещё ключи в `LLM_API_KEYS` |
| Sleep (503 после простоя) | Открой любую страницу — Space проснётся за ~30с |

---

## Что НЕ меняется

- **Структура кода бэкенда** — та же что в `backend/app/`. HF Dockerfile просто запускает uvicorn на 7860 вместо 8000.
- **Фронтенд** — не трогается, только переменные окружения.
- **Контент заданий** — тот же.
- **Локальная разработка** — продолжается через `docker compose up -d` + локальный uvicorn, как в `DEPLOY.md`.

Когда задеплоишь — пришли URL Space, я подключу фронт.
