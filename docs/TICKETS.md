# TICKETS — MVP 5 класса

_Нарезано autopilot Фаза 3 (to-tickets) из docs/SPEC.md. 1 тикет = 1 субагент = 1 коммит на main._

## Уже сделано (база)
- T1 ✅ (bd23c8e) модель ling
- T9 ✅ (d739823) навигация из index.json
- T5 ✅ (91c8fb7) единый normalize

## Тикеты

### Backend-голос (серия, serialize по main.py)
- **T2** — fallback на nemotron при пустом content (key_rotation/main.py, .env). Зависит: T1 ✅
- **T3** — anti-empty: при пустом ответе после fallback слать `error`, не виснуть (main.py). Зависит: T2
- **T10** — роли по заданиям в prompts_config.json + prompt_router ищет по task_id (prompts_config.json, prompt_router.py). Независим
- **T11** — 3-мин финал: проверить _session_timer + final_feedback + фронт-экран завершения (main.py, VoiceChatTask.tsx). Зависит: T10

### Backend-аналитика
- **T16** — POST /api/event: параметризованная запись воронки в SQLite, события определены (main.py, новый services/analytics.py, models). Независим
- **T17** — HTTP Basic Auth на /admin/* + пароль в .env (main.py, config.py, .env.example). Независим

### Frontend-голос
- **T-del-chat** — удалить frontend/src/app/chat/page.tsx (единый экран = VoiceChatTask). Независим
- **T4** — гонка STT: guard double-start + надёжный resume после TTS (useSpeechRecognition.ts). Зависит: T3
- **T6** — кросс-браузерный фолбэк: баннер + текстовый ввод при supported=false (VoiceChatTask.tsx). Зависит: T-del-chat
- **T7** — визуальные состояния микрофона: чёткий offline/muted/listening (VoiceChatTask.tsx). Зависит: T-del-chat
- **T16-fe** — хук useAnalytics: события воронки → POST /api/event + device-session (lib/useAnalytics.ts, компоненты). Зависит: T16

### Frontend-задания
- **T8** — новый BuildSentenceTask.tsx + case в TaskRenderer + типы (отменяет RFL-30). Независим
- **T-progress** — useProgress (localStorage) + бейджи на карточках + счётчик «Пройдено N/16» (lib/useProgress.ts, sections/page.tsx, TaskRenderer подключает onComplete). Независим (но touches sections/page.tsx)

### Frontend-навигация/UI
- **T-grades** — class/page.tsx показывает только классы с контентом (динамически). Независим
- **T-colors** — цветовая кодировка 4 секций (sections/page.tsx SECTION_META). Независим (touches sections/page.tsx) — КОНФЛИКТ с T-progress по файлу → serialize

### Верификация/финал
- **T12** — sanity-чеки serializeContext + normalize в verify-content.mjs. Независим
- **T-audit** — браузерный аудит 16 заданий со скринами. Зависит: T8, T-progress, T-colors
- **T-mobile** — viewport meta + 100dvh + мобильный аудит. Финальный
- **T15** — e2e приёмка по Q11. Финал всех

## Порядок (по зависимостям и disjoint-файлам)

```
Волна 1 (параллельно, disjoint):  T8, T-del-chat, T10, T16, T17, T-grades, T12
Волна 2:                          T2(←T1), T6(←del-chat), T-colors(←del-chat, sections)
Волна 3:                          T3(←T2), T-progress(←после T-colors, тот же файл), T16-fe(←T16)
Волна 4:                          T4(←T3), T11(←T10)
Волна 5:                          T7(←T-del-chat/T6, VoiceChatTask)
Волна 6:                          T-audit(←T8,T-progress,T-colors)
Волна 7:                          T-mobile
Финал:                            T15
```
