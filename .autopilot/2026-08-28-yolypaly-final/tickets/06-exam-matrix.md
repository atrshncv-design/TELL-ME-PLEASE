# 06 — Великий экзамен: матрица, архивы, горизонт

**Требования:** R17, R18, R19, R20
**Blocked by:** —
**Зона:** `content/exam/`, `frontend/src/app/exam/`
**Волна:** 1
**Status:** pending

## Что должно заработать

- `exam/present` — «Мой сумасшедший день» перед `the guitar` добавлены варианты `write, am studying, passed, play`.
- `exam/past` — «Змея и Кролик» каждый item — один `___`, по два варианта (как в документе).
- `exam/future` — «Ловушка условных» 3-е предложение разделено на два item; «Космическая миссия» 8 пропусков с ключами `are launching/starts/will be flying/will have been travelling/will be working/will be monitoring/will find/will have returned`.

## Из брифа, дословно

> «Мой сумасшедший день надо перед словом guitar надо поставить the guitar и дать побольше выбора вариантов, а то все очень просто: Добавляем слова : write, am studying, passed, play»
> «Змея и Кролик нужно сделать сначала 1 выбор, потом другой… I (walked / was walking) when I saw a dog. -> was walking»
> «Ловушка условных 3 предложение поделить на 2 части (нужно сделать сначала 1 выбор, потом другой)»
> «Космическая Миссия оставить правильными ответы вот эти: … 8 ключей»

## Разделы спецификации

Истории 14,15,16,17.

## Критерии приёмки

- [ ] Exam JSON для 3 секторов соответствуют документу.
- [ ] Каждый affected item — один пропуск, корректные options/answers.
- [ ] verify-epoch PASS.
