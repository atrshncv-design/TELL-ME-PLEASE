# 02 — Noon×3, футер и стрелки

**Требования:** R10, R11, R12
**Blocked by:** —
**Зона:** `content/epochs/future-perfect/`, `frontend/src/components/tasks/DragAndDropTask.tsx`, `frontend/src/components/RightsFooter.tsx`, `frontend/src/components/tasks/QuizTask.tsx`
**Волна:** 1
**Status:** pending

## Что должно заработать

- В `future-perfect/a1/station-3.json` три чипа `noon` с разными `id` (`noon-1/2/3`), каждый кладётся отдельно в BY/AT.
- Футер `RightsFooter` — два абзаца: `Учитель-методист Time Travel Mission Ирина Булдакова. По вопросам… +7 929 275 10 54` / `Все права защищены…`.
- Во всех `QuizTask`/`ClozeTextTask`/`FlashcardsTask` — стрелки ←/→ для листания вопросов без засчитывания.

## Из брифа, дословно

> «Магия слов noon стоит 3 раза и когда пытаешься поставить его и туда и туда, то он не ставится»
> «Фразу внизу Все права защищены… Нужно заменить на эту : Учитель-методист … +7 929 275 10 54»
> «А мы можем сделать стрелочки у всех подобных упражнений и назад и вперед. Иногда просто хочется посмотреть что там впереди, не прорешивая, просто полистать упражнение»

## Разделы спецификации

Истории 10,11,12.

## Критерии приёмки

- [ ] `station-3.json` содержит 3 `noon` с разными `id`.
- [ ] `DragAndDropTask` key=`id`, display=`verb` — 3 noon перетаскиваются/тапаются отдельно.
- [ ] `RightsFooter` — новый порядок и телефон.
- [ ] `QuizTask` etc. — prev/next работают, `onComplete` только по «Проверить».
- [ ] `tsc` 0, `verify` PASS.
