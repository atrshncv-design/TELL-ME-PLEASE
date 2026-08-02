# TICKETS — Фаза 3: Пилот «Present Tenses 5 класс»

_Источник: `docs/SPEC-present-tenses-pilot.md`. Порядок = зависимостями. Статусы: ready-for-agent / in progress / done / failed._

## P1 — Механика «Кликни на ошибку» (ClickMistakeTask)

**Задача.** Новый тип задания: предложение с ошибкой → ученик кликает на неверное слово. Иногда «ловушка»: ошибки нет (кнопка «Здесь всё верно!»). По образцу контента `tobe_lie_detector` (но клик, не ввод).
- `frontend/src/components/tasks/ClickMistakeTask.tsx` + тип в `frontend/src/types/task.ts` + рендер в `TaskRenderer.tsx` (case "click-mistake").
- Формат JSON: `{ type: "click-mistake", items: [{ text: "I is a student.", wrong: "is" } | { text: "...", wrong: null }] }` — wrong=null = ловушка. Клик по слову: если оно == wrong → зелёный pop + ✓; если wrong=null и клик по «Всё верно» → ✓; неверный клик → shake.
- Стиль: Tailwind, цвета платформы, мобильный. Framer Motion для pop/shake.
- **Контент**: PS T8 (15 предл., 1 ловушка), PS P3 (15), PC №4 (15), PC №9 (14) — из `/tmp/new-materials/*.txt` (очистить от AI-мусора/опечаток).
- Проверка: tsc, build, ручной проход страницы задания.

## P2 — Механика «Флеш-карточки» (FlashcardsTask)

**Задача.** Новый тип: карточка со стимулом (подлежащее/слово) → переворот показывает реакцию (форма глагола). Таймер, счётчик, «перемешать», автопереворот.
- `frontend/src/components/tasks/FlashcardsTask.tsx` + тип + рендер (case "flashcards").
- JSON: `{ type: "flashcards", cards: [{ front: "I", back: "am" }, ...] }`. Переворот по клику, кнопки «Знаю/Не знаю» → счётчик, в конце итог.
- **Контент**: PS T1 (15 пар I—am, My mum—is…), PC №11 (15 пар I/play → I am playing).
- Проверка: tsc, build, ручной проход.

## P3 — Механика «Колесо удачи» (WheelTask)

**Задача.** Новый тип: спиннер со словами/вопросами (SVG-колесо, анимация вращения) → выпало слово → ученик отвечает (устно/выбором из вариантов). Кнопка «Крутить».
- `frontend/src/components/tasks/WheelTask.tsx` + тип + рендер (case "wheel").
- JSON: `{ type: "wheel", items: [{ label: "I", answer: "am" }, ...] }` (answer опционален — для самопроверки по кнопке «Показать ответ»).
- **Контент**: PC №1 «Светофор» (15 слов I—am, The dog—is…).
- Проверка: tsc, build, ручной проход.

## P4 — Контент Present Continuous 5 класс (JSON, существующие механики)

**Задача.** Создать JSON-задания из файла `Present Continuous 5 класс.txt` (собственно Continuous, НЕ первые 10 to-be-дублей):
- №12 Сборка (fill-in: am/is/are + V-ing, 15) · №13 Орфография (drag-and-drop пары, 15) · 3.1 Сортировка правил -ing (drag-and-drop группы, 15 глаголов) · 3.2 Орфотренажёр (fill-in, 15) · 3.3 Ловушка для глаз (quiz, 15) · №4 Анти-реакция (build-sentence, 15) · №5 Рефлекс вопроса (build-sentence, 10) · №6 Короткий ответ (quiz, 10) · №7 Фильтр Simple/Continuous (drag-and-drop группы, 15) · №8 Машина времени (quiz, 15) · №10 Письмо от подруги (cloze, 15) · №12 Угадай по эмодзи (quiz с эмодзи, 8) · №14 Два мира (drag-and-drop пары, 15) · №16 Интервью с кибер-другом (voice-chat, промпт-персонаж «10-летний бот», банк 15 вопросов).
- id: `pc_*` (present_continuous_*), категория grammar, добавить в `content/tasks/grade_5/index.json`.
- Очистить от AI-мусора и опечаток. Проверить форматы JSON по образцам существующих заданий.
- Проверка: валидность JSON, tsc/build, ручной проход нескольких заданий.

## P5 — Контент Present Simple 5 класс (недостающее)

**Задача.** JSON-задания из `Present Simple 5 класс (1).txt` (чего ещё нет в контенте):
- To be: T1 (flashcards, 15 — нужен P2) · T3 Множ.число (drag-and-drop группы is/are, 15) · T4 Анти-реакция (build-sentence, 15) · T5 Почемучка (build-sentence, 15) · T6 Короткий ответ (quiz, 15) · T7 Фильтр (quiz, 15) · T10 Разделительные (drag-and-drop пары, 15) · T11 Угадай кто (quiz с эмодзи, 10) · T12 Опросник (survey — отложить, если M4 не готов) · T13 Страны (drag-and-drop пары, 15) · T15 Визитка (fill-in шаблон, 15).
- Have got: H1 (quiz, 15) · H2 (fill-in, 15) · H3 (build-sentence, 15) · H4 (quiz, 15) · H5 Монстр (cloze, 15).
- Проверь себя: P1 (quiz, 15) · P2 (fill-in, 15) · P3 (click-mistake — нужен P1, 15) · P4 (build-sentence, 15) · P5 (cloze, 15).
- id: `ps_*` / `havegot_*` / `pscheck_*`, категория grammar, index.json.
- Проверка: валидность, tsc/build, ручной проход.

## P6 — Чат-бот учитель: шпаргалка «Правила» + режим «Спроси учителя»

**Задача.**
1. Компонент `RulesPanel` (модалка/панель «Правила») — справочник Present Simple из `/tmp/new-materials/Чат-бот учитель (1).txt` (разделы 1–8, 10: когда используется, образование, -s/-es, отрицание, вопросы, Wh, to be, слова-подсказки, короткая схема). Кнопка «📖 Правила» на страницах заданий Present Simple (в TaskRenderer или в карточке секции).
2. Задание «Спроси учителя» (voice-chat): системный промпт = разделы 1–10 справочника (правила + примеры + типичные ошибки для диагностики), персонаж — учитель английского. Отдельный JSON `ps_ask_teacher.json` (voice-chat) в секцию speaking или grammar.
- Проверка: tsc/build, ручной проход: шпаргалка открывается, «Спроси учителя» отвечает по правилам (SSE).

## P7 — Ссылки на песни (links.json)

**Задача.** Заменить заглушки в `content/tasks/grade_5/links.json` на реальные URL из файла Present Simple (6 ссылок rutube/yandex). Названия песен по контексту (Present Simple + to be).
- Проверка: URL отвечают 200 (curl).

## P8 — Верификация пилота + пуш

**Задача.** Полный прогон: `npx tsc --noEmit`, `npm run build`, скрипт проверки контента (все id уникальны, index.json валиден, файлы существуют), браузерный проход карты 5 класса (новые задания открываются и проходятся), коммит + пуш в origin. Отчёт для показа заказчице (список новых заданий).
