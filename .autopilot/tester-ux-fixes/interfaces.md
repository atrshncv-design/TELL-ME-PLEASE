# Интерфейсы и правила прогона

## Границы, решённые в спецификации

| Модуль | Владеет | Выставляет | Прячет |
|---|---|---|---|
| `VerbBot` + `BotChatModal` | флоат-бот, окно голосового чата | клик по аватару → модалка; пропсы позиции | выбор ветки speech/STT, персону промпта |
| `speech gate` (useSound-ключ) | правило «глушит ли звук всё» | `isSpeechAllowed(): boolean` + вызов в обоих speak-каналах | чтение localStorage |
| `verdict style helper` | визуал вердикта instant-check | константы классов и таймингов | логику таймеров конкретных тасков |
| `TaskHeader` | шапка станции | пропсы title/backHref (без изменений) | раскладку |
| `EpochTheory × SoundToggle` | видимость тумблера | флаг «модалка обучения открыта» | координацию z-слоёв |

Шов проверок один: публичные поверхности компонентов (клик, тумблер, выбор варианта). Автотестов в репо нет.

## Правила проекта для исполнителей

- Стек: Next.js (App Router) + React 19 + Tailwind 4, приложение в `frontend/`. ВАЖНО: установленная версия Next.js отличается от обучающих данных — перед написанием кода сверяйся с доками в `frontend/node_modules/next/dist/docs/`.
- Проверки: `cd frontend && npx tsc --noEmit` → 0 ошибок; `npm run build` → успешная сборка. Это обязательный критерий приёмки каждого таска.
- Автотестов в репо нет — поведение проверяется вручную по критериям таска.
- НЕ ТРОГАТЬ: `content/` (контент эпох), серверные контракты `/api/*`, зеркала `frontend/public/content/`.
- Новая зависимость = верни `BLOCKED` с обоснованием, не ставь пакет сам.
- Секреты: только имена переменных окружения, значений нет и не будет.
- Комментарии в коде — только там, где без них непонятно намерение; стиль существующих файлов соблюдать.

## Из таска 01 — бот-чат

- `BotChatModal({ onClose })` — маунт управляет жизненным циклом сессии
- Чат: POST /api/chat/stream, branch_id="verb_bot", персона в task_context
- useVerbBot() (say/speakText) — без изменений

## Из таска 02 — речевой гейт

- lib/useSound.ts: `isSpeechAllowed(): boolean`; `subscribeToSpeechGate(h): () => void`; `SOUND_GATE_EVENT="tmp-sound-gate-change"`
- Оба speak-канала гейтятся centrally; stop() немедленный по событию

## Из таска 03 — вердикт

- components/tasks/verdict.ts: `WRONG_HOLD_MS=1800`, `CORRECT_ADVANCE_MS=900`, `advanceDelayMs(correct)`, `optionVerdictStyle({checked,isCorrect,isSelected,answeredCorrectly})`, `CORRECT_ANSWER_PREFIX`
- Паттерн был только в QuizTask

## Из таска 04 — коллизии UI

- lib/useSound.ts экспортирует `EPOCH_THEORY_OPEN_EVENT` ("tmp-epoch-theory-open"), `reportEpochTheoryOpen(open)`, `isEpochTheoryOpen()`, `useSoundToggle() -> {enabled, toggle}`; EpochTheory репортит open/close (счётчик экземпляров), SoundToggle только читает хук
- TaskHeader: кнопке shrink-0/whitespace-nowrap, h1 min-w-0+truncate
