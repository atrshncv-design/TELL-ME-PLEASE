# todo — Атомарные задачи

## RFL-E: Доработка после Аудита №3 (раунд E)

### RFL-E1: yes_no distractor Do-items [IN PROGRESS]
- [ ] Исправить генерацию wrongVerb для Do-items с plural subjects
- [ ] Verify: 0 не-слов; distractor отличается от answer ровно одной словоформой
- [ ] Проблема: statement не содержит -s для множественного числа → diff не работает

### RFL-E2: yes_no distractor does-items [IN PROGRESS]
- [ ] Исправить -ies окончания (play → plaies вместо plays)
- [ ] Verify: items 4,8 имеют 3 опции; 0 случаев "lif"
- [ ] Проблема: current baseForm logic даёт "plaies" для "play"

### RFL-E3: adverbs_place middle-items [DONE]
- [x] Исправлено: используется i.full.replace(adverb, "___")
- [x] Verify: все 12 items грамматичны
- [x] Commit: в процессе (синхронизация с page.tsx)

### RFL-E4: харнес — единый источник normalize [DONE]
- [x] Создан scripts/normalize.mjs — SINGLE SOURCE OF TRUTH
- [x] verify-content.mjs импортирует из normalize.mjs
- [x] Page.tsx содержит inline-копию с sync comment
- [x] Verify: харнес проверяет актуальный код

### RFL-D1-D5: раунд D [DONE]
- [x] D1: коллизия веток (commit e7abd89)
- [x] D2: yes_no duplicates (commit e7abd89)
- [x] D3: adverbs_place middle-items (commit 90f5284)
- [x] D4: wh lowercase (commit a0c81cc)
- [x] D5: verify harness (commit e7abd89)

### Deferred (не критичны для MVP)
- C6/B6: tap-to-place (touch events API)
- C7/B7: высота чата (визуальная проверка)
- C8/B10: сценарные промпты (prompts_config.json)

## ИТОГО: 3/5 выполнено (E3, E4, D1-D5), 2 в процессе (E1, E2)
