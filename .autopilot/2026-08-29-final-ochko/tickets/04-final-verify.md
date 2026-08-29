# 04 — Финальная проверка ФИНАЛ 3

**Требования:** R01,R02,R03,R04,R05,R06,R07,R08,R09
**Blocked by:** 01,02,03
**Зона:** весь проект
**Волна:** 2
**Status:** pending

## Что должно заработать

- Все JSON валидны, зеркала byte-identical, `tsc`/`build`/`verify` зелёные, регрессия TO BE/huge list/Have you tried/монологи/recorder/problem/mini-проект/guitar/экзамен сохранена.

## Критерии приёмки

- [ ] `diff -rq content/epochs frontend/public/content/epochs` 0.
- [ ] `npx tsc --noEmit` 0, `npm run build` 10/10.
- [ ] `node scripts/verify-epoch.mjs` ✅, `verify-content.mjs` ✅.
