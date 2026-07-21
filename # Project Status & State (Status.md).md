# Project Status & State (Status.md)
**Проект:** Интерактивная платформа «TELL ME PLEASE»
**Последнее обновление:** Этап 3 завершён

## 1. Текущий этап
**Фаза:** Этап 4 (Разработка Frontend) — готов к старту.

## 2. Статус интеграций
- **LLM:** Стриминговый клиент, stream=True, парсинг SSE.
- **Key Rotation Manager:** Циклическая ротация по всем ключам при 429/403.
- **Prompt Router:** branch_id → промпт из prompts_config.json.
- **Context Window:** Скользящее окно 12 реплик.
- **Sentence Buffer:** Агрегация токенов по знакам .! ?
- **TTS (Kokoro-FastAPI):** Async POST, base64 mp3, голос af_bella.
- **Overlapping Execution:** TTS в фоне через asyncio.create_task, LLM не блокируется.
- **WebSocket:** Протокол: token → sentence → audio → done.

## 3. Артефакты Этапа 3
- `docker-compose.yml` — Kokoro-FastAPI CPU, порт 8880
- `backend/app/services/tts.py` — async TTS-клиент
- `backend/app/main.py` — обновлён: TTS + asyncio.create_task + await перед done

## 4. Артефакты Этапа 2
- `backend/app/services/key_rotation.py` — ротация ключей
- `backend/app/services/prompt_router.py` — State Machine
- `backend/app/services/context_window.py` — скользящее окно
- `backend/app/prompts_config.json` — хардкод-промпты 5-9 классов
