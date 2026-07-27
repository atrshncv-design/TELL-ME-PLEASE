# todo — Атомарные задачи

## Раунд F: Голос и тач

### F1: Аудиторские фиксы [DONE]
- [x] Guard empty choices в main.py (IndexError)
- [x] Error handler в VoiceChatTask
- [x] Commit: 0df5d4c

### F2: Kokoro TTS [IN PROGRESS]
- [ ] docker compose up -d (образ скачивается)
- [ ] Verify: в чате играет аудио (WS {type:"audio"})

### F3: Высота голосового чата [TODO]
- [ ] h-[100dvh]/min-h-0 для VoiceChatTask

### F4: tap-to-place [TODO]
- [ ] DragAndDropTask: tap-to-place для тачскринов

### F5: Сценарные промпты [TODO]
- [ ] prompts_config.json + scenario в init-протоколе

### F6: CI-проверка окружения [TODO]
- [ ] scripts/verify-env.mjs

## Human Check (после F2)
### Приоритет 1: Все 16 заданий grade_5
- [ ] endings_quiz (19 вопросов)
- [ ] yes_no (3 опции)
- [ ] wh_questions (пропуск)
- [ ] adverbs_place (словарный банк)

### Приоритет 2: Голосовые 14/16
- [ ] Поднять backend: uvicorn app.main:app --port 8000
- [ ] Поднять Kokoro: docker compose up -d
- [ ] Проверить 3-минутный диалог
