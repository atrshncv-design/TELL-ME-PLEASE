```
# Project Status & State (Status.md)
**Проект:** Интерактивная платформа «TELL ME PLEASE»
**Последнее обновление:** ✅ Платформа полностью готова

## 1. Текущий этап
**Фаза:** ✅ Все этапы завершены. Платформа готова к финальной проверке.
**Активная задача:** Ожидание финальной проверки перед сбором продакшен-версии.

## 2. Статус интеграций
* **STT (Web Speech API):** ✅ Нативный браузерный API, без нагрузки на сервер.
* **LLM (OpenCode Zen / deepseek-v4-flash-free):** ✅ Стриминг, `stream=True`, парсинг SSE.
* **TTS (Kokoro-FastAPI):** ✅ OpenAI-совместимый API, голос `af_bella`, base64 mp3.
* **Streaming Pipeline:** ✅ LLM → Sentence Buffer → async TTS → WebSocket audio. Перекрытие фаз.
* **Key Rotation Manager:** ✅ Циклическая ротация по всем ключам при 429/403.
* **Prompt Router (State Machine):** ✅ `branch_id` → промпт из `prompts_config.json`.
* **Context Window:** ✅ Скользящее окно 12 реплик (24 сообщения).
* **WebSocket Endpoint:** ✅ Протокол: token → sentence → audio → done → session_ended.
* **Frontend UI/UX:** ✅ 5 экранов: Home → Class → Sections → Chat → Session Complete.
* **WebSocket Client:** ✅ Хук `useWebSocket` с обработкой всех типов сообщений.
* **Echo Protection:** ✅ Микрофон на паузе при воспроизведении аудио.
* **Audio Player:** ✅ Очередь base64-чанков с автоочисткой URL.
* **Session Timer:** ✅ 3-минутный таймер (180 сек) на сервере и клиенте.
* **Final Feedback:** ✅ Автоматический прощальный промпт с анализом ошибок.
* **Graceful Shutdown:** ✅ Финальное аудио → session_ended → экран завершения.

## 3. Рабочие гипотезы и решения (Ralph Loop Log)
* **[УТВЕРЖДЕНО] Статичная маршрутизация LLM:** Промпты хардкодятся из `prompts_config.json` по `branch_id`.
* **[УТВЕРЖДЕНО] Streaming Pipeline с перекрытием фаз:** LLM не блокируется на генерацию аудио.
* **[УТВЕРЖДЕНО] Скользящее окно:** 12 реплик (24 сообщения) для экономии токенов.
* **[УТВЕРЖДЕНО] TTS через Kokoro-FastAPI:** OpenAI-совместимый API, локальный Docker, голос `af_bella`.
* **[УТВЕРЖДЕНО] STT на клиенте:** Web Speech API, без серверной нагрузки.
* **[УТВЕРЖДЕНО] Защита от эха:** Микрофон на паузе во время воспроизведения аудио.
* **[УТВЕРЖДЕНО] 3-минутная сессия:** `asyncio.sleep` на сервере + `setInterval` на клиенте. Финальный фидбек через LLM.
* **[УТВЕРЖДЕНО] Graceful shutdown:** Клиент ждёт завершения последнего аудио перед показом экрана.

## 4. Отклоненные пути (Rejected Solutions)
* ❌ **Серверный STT (Whisper/Faster-Whisper):** Высокая нагрузка, нарушение "Нулевого бюджета".
* ❌ **Динамическая генерация промптов внутри LLM:** Пустая трата токенов, latency, галлюцинации.

## 5. Текущие блокеры (Blockers)
* Отсутствуют.

## 6. Артефакты Этапа 6
* `/backend/app/core/config.py` — добавлен `session_timeout_seconds = 180`
* `/backend/app/prompts_config.json` — добавлен `final_feedback` промпт
* `/backend/app/api/websocket.py` — таймер сессии + финальный фидбек + `session_ended`
* `/backend/app/services/llm.py` — параметр `system_prompt` для переопределения
* `/frontend/src/app/chat/page.tsx` — таймер, экран завершения, обработка `session_ended`
* `/frontend/src/lib/useWebSocket.ts` — тип `session_ended`

## 7. Артефакты Этапов 4+5
* `/frontend/src/app/page.tsx` — Главный экран
* `/frontend/src/app/class/page.tsx` — Выбор класса
* `/frontend/src/app/class/[grade]/sections/page.tsx` — Выбор раздела
* `/frontend/src/lib/useSpeechRecognition.ts` — Web Speech API hook
* `/frontend/src/lib/useAudioPlayer.ts` — Audio playback hook

## 8. Артефакты Этапов 2+3
* `/backend/app/services/key_rotation.py` — ротация ключей
* `/backend/app/services/prompt_router.py` — State Machine
* `/backend/app/services/context_window.py` — скользящее окно
* `/backend/app/services/tts.py` — async TTS-клиент
* `/docker-compose.yml` — Kokoro-FastAPI
```
