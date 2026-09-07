window.STATE =
{
  "slug": "pravki-070926",
  "dir": "2026-09-07-pravki-070926--wip",
  "title": "Правки 070926 — научрук, мемы, анкеты",
  "mode": "semi",
  "depth": "normal",
  "polish": null,
  "tier": "T3",
  "briefFile": "2026-09-07-brief.md",
  "memoryFile": "AGENTS.md",
  "skillDir": "/Users/aleksandrtrisenkov/.agents/skills/autopilot",
  "startedAt": "2026-09-07T07:55:00+04:00",
  "updatedAt": "2026-09-07T12:00:00+04:00",
  "finishedAt": null,
  "stages": [
    { "id": "preflight", "status": "done", "startedAt": "2026-09-07T07:54:00+04:00", "finishedAt": "2026-09-07T07:55:00+04:00" },
    { "id": "manifest", "status": "done", "startedAt": "2026-09-07T07:55:00+04:00", "finishedAt": "2026-09-07T07:55:00+04:00" },
    { "id": "briefing", "status": "done", "startedAt": "2026-09-07T07:55:00+04:00", "finishedAt": "2026-09-07T08:05:00+04:00", "note": "6 вопросов" },
    { "id": "spec", "status": "done", "startedAt": "2026-09-07T08:05:00+04:00", "finishedAt": "2026-09-07T08:20:00+04:00" },
    { "id": "plan", "status": "done", "startedAt": "2026-09-07T08:20:00+04:00", "finishedAt": "2026-09-07T08:30:00+04:00", "note": "10 тасков, ярус T3" },
    { "id": "build", "status": "active", "startedAt": "2026-09-07T11:10:00+04:00", "note": "доп. таски 11–12" },
    { "id": "review", "status": "done", "startedAt": "2026-09-07T09:00:00+04:00", "finishedAt": "2026-09-07T11:00:00+04:00", "note": "проверено 10 из 10" },
    { "id": "final", "status": "pending" }
  ],
  "requirements": {
    "total": 113, "done": 108, "inTicket": 0, "inSpec": 0,
    "placeholder": 0, "deferred": 2, "dropped": 3
  },
  "tickets": [
    { "id": "01", "title": "Страница эпохи: навигация, портал, печать, таблица", "requirements": ["R01","R03","R04","R05","R06","R07","R08","R09","R10","R11","R111","R112","A01"], "blockedBy": [], "wave": 1, "zone": ["epoch-page"], "status": "done", "startedAt": "2026-09-07T08:35:00+04:00", "finishedAt": "2026-09-07T09:10:00+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "tests": {"passed": 2, "failed": 0}, "commit": "31d0df7", "concerns": ["R10/R11 placeholder — таблица внутри PDF"] },
    { "id": "02", "title": "Чинить трекинг достижений", "requirements": ["R02"], "blockedBy": [], "wave": 1, "zone": ["achievements"], "status": "done", "finishedAt": "2026-09-07T10:40:00+04:00", "commit": "31d0df7", "startedAt": "2026-09-07T09:12:00+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "tests": {"passed": 3, "failed": 0} },
    { "id": "03", "title": "Сквозные правила экрана задания", "requirements": ["R13","R14","R15","R17"], "blockedBy": [], "wave": 1, "zone": ["task-ui"], "status": "done", "finishedAt": "2026-09-07T10:40:00+04:00", "commit": "37bedd6", "startedAt": "2026-09-07T08:35:00+04:00", "retries": 0, "repairs": 1, "handoffs": 1, "repairFindings": ["R13/R15/R17 в QuizTask и VoiceChat — ревью"], "tests": {"passed": 2, "failed": 0} },
    { "id": "04", "title": "Тексты Present Simple + Present Continuous", "requirements": ["R12","R16","R18-R53"], "blockedBy": [], "wave": 2, "zone": ["content-present"], "status": "done", "finishedAt": "2026-09-07T10:40:00+04:00", "commit": "843a5bf", "startedAt": "2026-09-07T09:12:00+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "tests": {"passed": 3, "failed": 0} },
    { "id": "08", "title": "Экзамен: позиция и метки сессии", "requirements": ["R103","R104"], "blockedBy": [], "wave": 2, "zone": ["exam"], "status": "done", "finishedAt": "2026-09-07T10:40:00+04:00", "commit": "9aac3c1", "startedAt": "2026-09-07T09:40:00+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "tests": {"passed": 2, "failed": 0} },
    { "id": "09", "title": "Рецензия анкет", "requirements": ["R108","R109","R110i"], "blockedBy": [], "wave": 2, "zone": ["docs"], "status": "done", "startedAt": "2026-09-07T09:12:00+04:00", "finishedAt": "2026-09-07T09:12:00+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "note": "выполнено оркестратором досрочно — ankety-review.md" },
    { "id": "05", "title": "Тексты Present Perfect + PPC", "requirements": ["R54-R82"], "blockedBy": [], "wave": 3, "zone": ["content-perfect"], "status": "done", "finishedAt": "2026-09-07T10:40:00+04:00", "commit": "cd984d5", "startedAt": "2026-09-07T09:40:00+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "tests": {"passed": 3, "failed": 0} },
    { "id": "06", "title": "Тексты Past", "requirements": ["R83-R95"], "blockedBy": [], "wave": 4, "zone": ["content-past"], "status": "done", "finishedAt": "2026-09-07T10:40:00+04:00", "commit": "4096a29", "startedAt": "2026-09-07T10:15:00+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "tests": {"passed": 3, "failed": 0} },
    { "id": "07", "title": "Тексты Future", "requirements": ["R96-R102"], "blockedBy": [], "wave": 5, "zone": ["content-future"], "status": "done", "finishedAt": "2026-09-07T10:40:00+04:00", "commit": "c53e0e0", "startedAt": "2026-09-07T10:15:00+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "tests": {"passed": 3, "failed": 0} },
    { "id": "10", "title": "Финальная проверка пакета", "requirements": ["all"], "blockedBy": ["01","02","03","04","05","06","07","08","09"], "wave": 6, "zone": ["repo"], "status": "done", "startedAt": "2026-09-07T10:40:00+04:00", "finishedAt": "2026-09-07T11:00:00+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "tests": {"passed": 5, "failed": 0}, "commit": "02166f7", "concerns": ["eslint без baseline; 1 новое того же семейства", "pc9_photo_oge пустое — до нас"] },
    { "id": "11", "title": "Синяя таблица в PDF", "requirements": ["R10","R11"], "blockedBy": [], "wave": 6, "zone": ["pdfs"], "status": "done", "startedAt": "2026-09-07T11:10:00+04:00", "finishedAt": "2026-09-07T11:30:00+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "commit": null, "note": "ё BLOCKED — нет глифа в сабсете; Continuous уже ок; ряда ФАКТ в PDF нет" },
    { "id": "13", "title": "Пример PPC заменить", "requirements": ["R76"], "blockedBy": [], "wave": 7, "zone": ["content-ppc"], "status": "done", "startedAt": "2026-09-07T11:45:00+04:00", "finishedAt": "2026-09-07T12:00:00+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "commit": null },
    { "id": "14", "title": "pc9 починить тип", "requirements": ["G01"], "blockedBy": [], "wave": 7, "zone": ["content-tasks"], "status": "done", "startedAt": "2026-09-07T11:45:00+04:00", "finishedAt": "2026-09-07T12:00:00+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "commit": null },
    { "id": "12", "title": "Опечатки брифа в текстах", "requirements": ["R24","R36","R45"], "blockedBy": [], "wave": 6, "zone": ["content-present"], "status": "done", "startedAt": "2026-09-07T11:10:00+04:00", "finishedAt": "2026-09-07T11:30:00+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "commit": "843a5bf" }
  ],
  "singlePass": null,
  "tests": null,
  "debt": { "placeholders": ["R66 — механика B2-1 без изменений", "R76 — пример PPC A2-3 как есть", "ЧБ/А5 PDF — кнопка готова, файлов нет"], "assumptions": ["R49 — «Все 5 функций» по тексту «Нужно»", "R92 — «Победа Перфектов»"], "emptyEnv": [] },
  "additions": ["A01 — возврат к якорю сектора (ради R03/R103)"],
  "coverage": { "found": 5, "fixed": 0, "deferred": 0, "note": "G2: пропусков нет; 2 half уже в открытых местах спеки; 3 extra — углубления и существующее поведение" },
  "concerns": ["craft/01+03: листалка и бар продублированы в 3 типах — общий компонент", "craft/01+03: break-words размазан по 5 компонентам — одно правило", "craft/01+03: sticky/bottom-фикс ехал с механикой", "craft/08: якорный скролл скопирован из epoch-страницы", "craft/08: exam-TaskRenderer расширил контракт", "craft: формула монолога тремя текстами", "craft: сборка типов в effect страницы, не в lib", "craft: метка сессии строкой + ветки без падающих тестов", "lint: +1 set-state-in-effect нашего кода (семейство из 4 соседних)", "pc9_photo_oge пустое — было до нас"],
  "reviewers": { "manifestSpec": "ses_f85e41710ffe0VVv2IsNAbtEwx", "craft": "ses_f85e41701ffeN7QICNfOy6vmhc" },
  "blind": null
}
