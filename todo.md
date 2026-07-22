# todo — Атомарные задачи

## RFL-B: Доработка после Аудита №2

### RFL-B1: Baseline-коммит [DONE]
- [x] git commit "feat: RFL-01..30 baseline per audit #2"
- [x] Commit: 7d0e143

### RFL-B2: yes_no_questions генератор [DONE]
- [x] Исправлен wrongVerb regex (не бьёт по "Does")
- [x] Убран q+"?" (дублирующий "?")
- [x] Options перемешиваются
- [x] Verify: npm run build ✅

### RFL-B3: adverbs_place hint [DONE]
- [x] Убран hint: i.full (ответ не показывается)
- [x] Verify: npm run build ✅

### RFL-B4: wh_questions blank [DONE]
- [x] Вставлен "___" в начало предложения
- [x] Answer = вопросительный префикс (1-2 слова)
- [x] Verify: npm run build ✅

### RFL-B5: wasListeningRef [DONE]
- [x] wasListeningRef.current = listening (не true)
- [x] Verify: npm run build ✅

### RFL-B6: tap-to-place [DEFERRED]
- [ ] Требует touch events API

### RFL-B7: высота чата [DEFERRED]
- [ ] Требует визуальной проверки

### RFL-B8: палитра в layout [DONE]
- [x] layout.tsx: updated to violet/sky/amber
- [x] Verify: npm run build ✅

### RFL-B9: error.tsx ссылка [DONE]
- [x] Добавлена ссылка "← К разделам"
- [x] Verify: npm run build ✅

### RFL-B10: сценарные промпты [DEFERRED]
- [ ] Требует prompts_config.json

### RFL-B11: role-play роли [DONE]
- [x] AI = character (harry), student = interviewer
- [x] Исправлен комментарий
- [x] Verify: npm run build ✅

### RFL-B12: пер-типовая валидация [DONE]
- [x] QuizTask: guards для пустых items/item
- [x] FillInTask: guards для пустых items/item/sentence
- [x] Verify: npm run build ✅

## ИТОГО: 8/12 выполнено, 4 deferred
