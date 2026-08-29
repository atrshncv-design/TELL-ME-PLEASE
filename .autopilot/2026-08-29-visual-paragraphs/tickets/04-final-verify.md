# 04 — Финальная проверка 290826

**Требования:** R01,R02,R03,R04,R05,R06,R07,R08,R09,R10,R11,R12,R13,R14,R15,R16,R17
**Blocked by:** 01,02,03
**Зона:** весь проект
**Волна:** 2
**Status:** pending

## Что должно заработать

- Все JSON валидны, зеркала byte-identical, `tsc`/`build`/`verify` зелёные, визуал и регрессия предыдущих паков сохранены (TO BE рамка, huge list, Have you tried, монологи, recorder, problem, mini-проект, guitar, экзамен).

## Критерии приёмки

- [ ] `diff -rq content/epochs frontend/public/content/epochs` 0 и `content/exam`.
- [ ] `npx tsc --noEmit` 0, `npm run build` 10/10.
- [ ] `node scripts/verify-epoch.mjs` ✅ и `verify-content.mjs` ✅.
