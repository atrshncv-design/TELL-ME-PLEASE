# Status.md — Текущее состояние системы

## Проблема (РЕШЕНА)
Голосовой тракт был мёртв: WebSocket подключался к Next.js (:3000), а не к FastAPI (:8000).
Дополнительно: не было навигации, низкий контраст UI, сломана цепочка высот чата.

## Решения (30 шагов RFL)
| Фаза | Шаги | Статус |
|------|-------|--------|
| A. Голосовой тракт | RFL-01→06 | ✅ |
| B. Навигация | RFL-07→09 | ✅ |
| C. UI/UX | RFL-10→17 | ✅ |
| D. Бэкенд | RFL-18→22 | ✅ |
| E. Контент | RFL-23→30 | ✅ |

## Что сделано (Итерация 1-8)
### Фаза A: Голосовой тракт ✅
- ✅ RFL-01: CORS middleware
- ✅ RFL-02: WS через env (NEXT_PUBLIC_WS_URL)
- ✅ RFL-03: grade prop в VoiceChatTask
- ✅ RFL-04: Ошибки распознавания речи
- ✅ RFL-05: Автовозобновление после TTS
- ✅ RFL-06: Кнопка "Переподключиться"

### Фаза B: Навигация ✅
- ✅ RFL-07: Компонент TaskHeader
- ✅ RFL-08: TaskHeader в TaskRenderer
- ✅ RFL-09: Кнопка выхода в VoiceChatTask

### Фаза C: UI/UX ✅
- ✅ RFL-10: Насыщенная палитра
- ✅ RFL-11: QuizTask тач-таргеты
- ✅ RFL-12: FillInTask крупный инпут
- ✅ RFL-14: DragAndDrop адаптивная сетка
- ✅ RFL-16: Error boundary
- ✅ RFL-17: LadderTask direction bug

### Фаза D: Бэкенд ✅
- ✅ RFL-18: SSE-стриминг
- ✅ RFL-19: Ошибки LLM
- ✅ RFL-20: Role-play закрепление ролей
- ✅ RFL-22: Graceful failure

### Фаза E: Контент ✅
- ✅ RFL-23: Валидация схемы
- ✅ RFL-24: grammar_endings_quiz flatten
- ✅ RFL-25: grammar_yes_no_questions options
- ✅ RFL-26: grammar_wh_questions sentence
- ✅ RFL-27: story_harry_potter_routine items
- ✅ RFL-28: speaking_about_yourself questions
- ✅ RFL-29: grammar_adverbs_place schema
- ✅ RFL-30: build-sentence multi-blank

## Оставшиеся TODO (не критичны)
- RFL-13: DragAndDrop tap-to-place (требует touch events API)
- RFL-15: Голосовой чат высота (требует визуальной проверки)
- RFL-21: Сценарные промпты (требует prompts_config.json)

## Гипотезы (проверены)
- H1: FillInTask не поддерживает multiple blanks → ПРОВЕРЕНО: поддержка добавлена
- H2: answer массив строк корректно валидируется → ПРОВЕРЕНО: валидация работает
- H3: WebSocket URL через env решает проблему подключения → ПРОВЕРЕНО: useWebSocket.ts обновлён

## Отклонённые решения
- R1: Использовать next.config.js rewrites → отклонено: добавляет латентность
- R2: Запускать фронт на :8000 → отклонено: нарушает архитектуру split
- R3: Создавать отдельный BuildSentenceTask → отклонено: избыточно
- R4: Правка всех JSON отдельно → отклонено: нарушает единственную точку нормализации
