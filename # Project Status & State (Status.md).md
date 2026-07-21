# Project Status & State (Status.md)
**Проект:** Интерактивная платформа «TELL ME PLEASE»
**Последнее обновление:** Этапы 4+5 завершены

## 1. Текущий этап
**Фаза:** Этап 6 (Бизнес-логика сессии) — готов к старту.

## 2. Статус интеграций
- **Frontend UI/UX:** 4 экрана: Home → Class → Sections → Chat. TailwindCSS + Framer Motion.
- **WebSocket Client:** Хук useWebSocket — подключение, отправка branch_id/text, обработка token/sentence/audio/done.
- **STT (Web Speech API):** Хук useSpeechRecognition — нативный браузерный API, continuous mode, auto-restart.
- **Audio Player:** Хук useAudioPlayer — очередь base64-чанков, декодирование, воспроизведение.
- **Echo Protection:** Микрофон на паузе при воспроизведении аудио (enabled={!muted}).
- **Backend TTS:** Async POST к Kokoro, base64 mp3, голос af_bella.
- **Overlapping Execution:** TTS в фоне через asyncio.create_task.

## 3. Артефакты Этапов 4+5
- `frontend/src/app/page.tsx` — Главный экран (Welcome)
- `frontend/src/app/class/page.tsx` — Выбор класса (5-9)
- `frontend/src/app/class/[grade]/sections/page.tsx` — Выбор раздела
- `frontend/src/app/chat/page.tsx` — Экран чата (STT + WS + Audio + Echo Protection)
- `frontend/src/lib/useWebSocket.ts` — WebSocket client hook
- `frontend/src/lib/useSpeechRecognition.ts` — Web Speech API hook
- `frontend/src/lib/useAudioPlayer.ts` — Audio playback hook

## 4. Артефакты Этапа 3
- `docker-compose.yml` — Kokoro-FastAPI CPU, порт 8880
- `backend/app/services/tts.py` — async TTS-клиент
- `backend/app/main.py` — TTS + asyncio.create_task
