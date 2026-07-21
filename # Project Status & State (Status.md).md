# Project Status & State (Status.md)
**Проект:** Интерактивная платформа «TELL ME PLEASE»
**Последнее обновление:** ✅ Платформа полностью готова

## 1. Текущий этап
**Фаза:** ✅ Все этапы завершены. Платформа готова к финальной проверке.

## 2. Статус интеграций
- **LLM:** Стриминговый клиент, stream=True, парсинг SSE.
- **Key Rotation Manager:** Циклическая ротация по всем ключам при 429/403.
- **Prompt Router:** branch_id → промпт из prompts_config.json.
- **Context Window:** Скользящее окно 12 реплик.
- **Sentence Buffer:** Агрегация токенов по знакам .! ?
- **TTS (Kokoro-FastAPI):** Async POST, base64 mp3, голос af_bella.
- **Overlapping Execution:** TTS в фоне через asyncio.create_task.
- **WebSocket:** Протокол: token → sentence → audio → done → session_ended.
- **Frontend UI/UX:** 4 экрана: Home → Class → Sections → Chat.
- **WebSocket Client:** Хук useWebSocket — обработка всех типов сообщений.
- **STT:** Хук useSpeechRecognition — нативный браузерный API.
- **Audio Player:** Хук useAudioPlayer — очередь base64-чанков.
- **Echo Protection:** Микрофон на паузе при воспроизведении аудио.
- **Session Timer:** 180 сек на сервере (asyncio.sleep) и клиенте (setInterval).
- **Final Feedback:** Автоматический прощальный промпт с анализом ошибок.
- **Graceful Shutdown:** Финальное аудио → session_ended → экран завершения.

## 3. Артефакты Этапа 6
- `backend/app/main.py` — таймер сессии + финальный фидбек + session_ended
- `backend/app/prompts_config.json` — добавлен final_feedback промпт
- `frontend/src/app/chat/page.tsx` — таймер, экран завершения, обработка session_ended

## 4. Артефакты Этапов 4+5
- `frontend/src/app/page.tsx` — Главный экран
- `frontend/src/app/class/page.tsx` — Выбор класса
- `frontend/src/app/class/[grade]/sections/page.tsx` — Выбор раздела
- `frontend/src/lib/useWebSocket.ts` — WebSocket client hook
- `frontend/src/lib/useSpeechRecognition.ts` — Web Speech API hook
- `frontend/src/lib/useAudioPlayer.ts` — Audio playback hook

## 5. Артефакты Этапов 2+3
- `backend/app/services/key_rotation.py` — ротация ключей
- `backend/app/services/prompt_router.py` — State Machine
- `backend/app/services/context_window.py` — скользящее окно
- `backend/app/services/tts.py` — async TTS-клиент
- `docker-compose.yml` — Kokoro-FastAPI
