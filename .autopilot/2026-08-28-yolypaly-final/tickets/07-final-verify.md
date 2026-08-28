# 07 — Финальная проверка пака ЁЛЫПАЛЫ

**Требования:** R01–R20
**Blocked by:** 01,02,03,04,05,06
**Зона:** весь проект
**Волна:** 2
**Status:** pending

## Что должно заработать

- Все JSON валидны, зеркала byte-identical, `tsc` и `build` зелёные, `verify-epoch/content` PASS.

## Критерии приёмки

- [ ] `diff -rq content/epochs frontend/public/content/epochs` 0, аналогично `content/exam`.
- [ ] `npx tsc --noEmit` 0, `npm run build` 10/10 static.
- [ ] `node scripts/verify-epoch.mjs` ✅, `node scripts/verify-content.mjs` ✅.
