# Project Status & State (Status.md)
**Проект:** Интерактивная платформа «TELL ME PLEASE»
**Последнее обновление:** Этап 2 завершён

## 1. Текущий этап
**Фаза:** Этап 3 (Интеграция LLM и TTS) — готов к старту.

## 2. Статус интеграций
- **LLM (OpenCode Zen / deepseek-v4-flash-free):** Стриминговый клиент в main.py, stream=True, парсинг SSE.
- **Key Rotation Manager:** services/key_rotation.py — циклическая ротация по всем ключам при 429/403.
- **Prompt Router (State Machine):** services/prompt_router.py — branch_id → промпт из prompts_config.json.
- **Context Window:** services/context_window.py — скользящее окно 12 реплик (24 сообщения).
- **Sentence Buffer:** В main.py — агрегация токенов по знакам .! ?
- **WebSocket Endpoint:** /ws/chat — протокол: token → sentence → done.

## 3. Рабочие гипотезы (Ralph Loop Log)
- **[УТВЕРЖДЕНО] Статичная маршрутизация LLM:** Промпты хардкодятся из prompts_config.json по branch_id.
- **[УТВЕРЖДЕНО] Скользящее окно:** 12 реплик (24 сообщения) для экономии токенов.

## 4. Отклоненные пути
- Серверный STT (Whisper) — отклонено, высокая нагрузка.
- Динамическая генерация промптов — отклонено, пустая трата токенов.

## 5. Текущие блокеры
- Отсутствуют.

## 6. Артефакты Этапа 2
- `backend/app/main.py` — FastAPI + WebSocket + Sentence Buffer
- `backend/app/services/key_rotation.py` — ротация ключей
- `backend/app/services/prompt_router.py` — State Machine
- `backend/app/services/context_window.py` — скользящее окно
- `backend/app/prompts_config.json` — хардкод-промпты 5-9 классов
- `backend/.env` — OPENCODE_API_KEYS
