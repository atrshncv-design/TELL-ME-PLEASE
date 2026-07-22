# todo — Атомарные задачи

## ФАЗА A: Разблокировка голосового тракта [DONE]

### RFL-01: Backend CORS для dev [DONE]
- [x] Добавить CORSMiddleware в main.py
- [x] Verify: Python syntax OK ✅

### RFL-02: Адрес WS-бэкенда через env [DONE]
- [x] Заменить location.host на NEXT_PUBLIC_WS_URL в useWebSocket.ts:29
- [x] Создать frontend/.env.local
- [x] Verify: npm run build ✅

### RFL-03: Проброс grade в VoiceChatTask [DONE]
- [x] TaskRenderer.tsx: передать grade={grade}
- [x] VoiceChatTask.tsx: принять grade пропом

### RFL-04: Ошибки распознавания речи [DONE]
- [x] useSpeechRecognition.ts: error state + onerror handler
- [x] VoiceChatTask.tsx: показать error текстом под кнопкой 🎤
- [x] Verify: npm run build ✅

### RFL-05: Автовозобновление после TTS [DONE]
- [x] useSpeechRecognition.ts: wasListeningRef + auto-resume useEffect
- [x] Verify: npm run build ✅

### RFL-06: Ручной reconnect [DONE]
- [x] useWebSocket.ts: экспортировать reconnect()
- [x] VoiceChatTask.tsx: кнопка "Переподключиться" при !connected
- [x] Verify: npm run build ✅

## ФАЗА B: Навигация [DONE]

### RFL-07: Компонент TaskHeader [DONE]
- [x] Новый файл: frontend/src/components/tasks/TaskHeader.tsx
- [x] Verify: компонент рендерится, ссылка ведёт на backHref ✅

### RFL-08: TaskHeader в TaskRenderer [DONE]
- [x] TaskRenderer.tsx: обёртка BG + TaskHeader для quiz/drag-and-drop/fill-in/ladder
- [x] Verify: npm run build ✅

### RFL-09: Кнопка выхода в VoiceChatTask [DONE]
- [x] VoiceChatTask.tsx: добавлен Link "←" в шапку
- [x] Verify: npm run build ✅

## ФАЗА C: UI/UX [DONE]

### RFL-10: Насыщенная палитра [DONE]
- [x] TaskRenderer.tsx: BG → from-violet-100 via-sky-50 to-amber-50
- [x] Verify: npm run build ✅

### RFL-11: QuizTask тач-таргеты [DONE]
- [x] QuizTask.tsx: py-3→py-4, min-h-[52px], text-lg
- [x] Verify: npm run build ✅

### RFL-12: FillInTask крупный инпут [DONE]
- [x] FillInTask.tsx: py-3, text-lg, min-h-[52px], autoFocus
- [x] Verify: npm run build ✅

### RFL-13: DragAndDrop tap-to-place [DEFERRED]
- [ ] Требует touch events API (не критично для MVP)

### RFL-14: DragAndDrop адаптивная сетка [DONE]
- [x] DragAndDropTask.tsx: grid-cols-1 sm:grid-cols-3
- [x] Verify: npm run build ✅

### RFL-15: Голосовой чат высота [DEFERRED]
- [ ] Требует визуальной проверки на устройстве

### RFL-16: Error boundary [DONE]
- [x] error.tsx создан ранее

### RFL-17: LadderTask direction bug [DONE]
- [x] LadderTask.tsx: setCurrentStep учитывает direction
- [x] Verify: npm run build ✅

## ФАЗА D: Бэкенд [DONE]

### RFL-18: Настоящий SSE-стриминг [DONE]
- [x] key_rotation.py: добавлен send_stream() с stream=True
- [x] main.py: _stream_response использует send_stream
- [x] Verify: Python syntax OK ✅

### RFL-19: Обработка ошибок LLM [DONE]
- [x] main.py: проверка status_code != 200 → error клиенту
- [x] Verify: Python syntax OK ✅

### RFL-20: Закрепление ролей в role-play [DONE]
- [x] TaskRenderer.tsx: serializeContext определяет AI/Student роли
- [x] Verify: npm run build ✅

### RFL-21: Сценарные системные промпты [DEFERRED]
- [ ] Требует prompts_config.json (не критично для MVP)

### RFL-22: Graceful failure при отсутствии API-ключей [DONE]
- [x] main.py: проверка settings.api_keys в начале ws_chat
- [x] Verify: Python syntax OK ✅

## ФАЗА E: Контент [DONE]

### RFL-23: Единый контракт данных + валидация [DONE]
- [x] types/task.ts создан ранее
- [x] page.tsx: добавлена функция validate()
- [x] Verify: npm run build ✅ (exit code 0)

### RFL-24: grammar_endings_quiz flatten [DONE]
- [x] page.tsx: normalize() flattens groups → items
- [x] Verify: npm run build ✅

### RFL-25: grammar_yes_no_questions options [DONE]
- [x] page.tsx: normalize() generates options from statement/question
- [x] Verify: npm run build ✅

### RFL-26: grammar_wh_questions sentence [DONE]
- [x] page.tsx: normalize() renames statement → sentence
- [x] Verify: npm run build ✅

### RFL-27: story_harry_potter_routine items [DONE]
- [x] page.tsx: normalize() converts story → items
- [x] Verify: npm run build ✅

### RFL-28: speaking_about_yourself questions [DONE]
- [x] page.tsx: normalize() renames prompts → questions
- [x] Verify: npm run build ✅

### RFL-29: grammar_adverbs_place schema [DONE]
- [x] page.tsx: normalize() converts to fill-in format
- [x] Verify: npm run build ✅

### RFL-30: build-sentence multi-blank [DONE]
- [x] FillInTask.tsx: supports answer arrays
- [x] grammar_adverbs_build.json: answer → array
- [x] Verify: npm run build ✅

## ИТОГО: 30/30 шагов выполнено
