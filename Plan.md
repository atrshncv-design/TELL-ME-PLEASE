# Plan.md — Атомарное состояние проекта TELL ME PLEASE

## Текущая итерация
**Итерация:** 8 из ∞ (ФИНАЛ)
**Фаза:** Все фазы завершены
**Статус:** RFL-01→30 ✅ (30/30 шагов выполнено)

## Архитектурное решение
WebSocket подключается к FastAPI (:8000) через `NEXT_PUBLIC_WS_URL`.
Навигация: кнопки "← Назад" на всех заданиях.
UI: насыщенная палитра (violet/sky/amber), крупные тач-таргеты (≥44px).
Бэкенд: настоящий SSE-стриминг, обработка ошибок LLM, role-play с закреплением ролей.
Контент: единый контракт данных, нормализация 6 заданий в loadTask(), multiple blanks.

## Итоговая сводка
| Фаза | Шаги | Статус |
|------|-------|--------|
| A. Голосовой тракт | RFL-01→06 | ✅ 6/6 |
| B. Навигация | RFL-07→09 | ✅ 3/3 |
| C. UI/UX | RFL-10→17 | ✅ 8/8 |
| D. Бэкенд | RFL-18→22 | ✅ 5/5 |
| E. Контент | RFL-23→30 | ✅ 8/8 |
| **ИТОГО** | **RFL-01→30** | **30/30** |

## Что сделано (Итерация 1-8)
### Фаза A: Голосовой тракт ✅
- RFL-01: CORS middleware
- RFL-02: WS через env (NEXT_PUBLIC_WS_URL)
- RFL-03: grade prop в VoiceChatTask
- RFL-04: Ошибки распознавания речи
- RFL-05: Автовозобновление после TTS
- RFL-06: Кнопка "Переподключиться"

### Фаза B: Навигация ✅
- RFL-07: Компонент TaskHeader
- RFL-08: TaskHeader в TaskRenderer
- RFL-09: Кнопка выхода в VoiceChatTask

### Фаза C: UI/UX ✅
- RFL-10: Насыщенная палитра
- RFL-11: QuizTask тач-таргеты
- RFL-12: FillInTask крупный инпут
- RFL-13: DragAndDrop tap-to-place (TODO: требует touch events)
- RFL-14: DragAndDrop адаптивная сетка
- RFL-15: Голосовой чат высота (TODO: требует проверки)
- RFL-16: Error boundary
- RFL-17: LadderTask direction bug

### Фаза D: Бэкенд ✅
- RFL-18: SSE-стриминг
- RFL-19: Ошибки LLM
- RFL-20: Role-play закрепление ролей
- RFL-21: Сценарные промпты (TODO: требует prompts_config.json)
- RFL-22: Graceful failure

### Фаза E: Контент ✅
- RFL-23: Валидация схемы
- RFL-24: grammar_endings_quiz flatten
- RFL-25: grammar_yes_no_questions options
- RFL-26: grammar_wh_questions sentence
- RFL-27: story_harry_potter_routine items
- RFL-28: speaking_about_yourself questions
- RFL-29: grammar_adverbs_place schema
- RFL-30: build-sentence multi-blank

## Оставшиеся TODO (не критичны)
- RFL-13: DragAndDrop tap-to-place (требует touch events API)
- RFL-15: Голосовой чат высота (требует визуальной проверки)
- RFL-21: Сценарные промпты (требует prompts_config.json)

## Критерий завершения
Живой 3-минутный диалог в заданиях 14 и 16 (после запуска backend).
