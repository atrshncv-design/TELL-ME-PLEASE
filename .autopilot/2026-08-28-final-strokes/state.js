window.STATE =
{
  "slug": "final-strokes",
  "dir": "2026-08-28-final-strokes",
  "title": "Финальные штрихи правок клиентки",
  "mode": "interview",
  "depth": "normal",
  "polish": null,
  "tier": "T2",
  "briefFile": "2026-08-28-brief.md",
  "memoryFile": "AGENTS.md",
  "skillDir": "/Users/aleksandrtrisenkov/.agents/skills/autopilot",
  "startedAt": "2026-08-28T08:31:33+04:00",
  "updatedAt": "2026-08-28T10:16:43+04:00",
  "finishedAt": "2026-08-28T10:16:43+04:00",
  "stages": [
    { "id": "preflight", "status": "done", "startedAt": "2026-08-28T08:31:33+04:00", "finishedAt": "2026-08-28T08:32:45+04:00" },
    { "id": "manifest", "status": "done", "startedAt": "2026-08-28T08:32:45+04:00", "finishedAt": "2026-08-28T08:35:27+04:00" },
    { "id": "briefing", "status": "done", "startedAt": "2026-08-28T08:35:27+04:00", "finishedAt": "2026-08-28T09:06:32+04:00" },
    { "id": "spec", "status": "done", "startedAt": "2026-08-28T09:06:32+04:00", "finishedAt": "2026-08-28T09:24:36+04:00" },
    { "id": "plan", "status": "done", "startedAt": "2026-08-28T09:24:36+04:00", "finishedAt": "2026-08-28T09:32:32+04:00", "note": "8 тасков, ярус T2" },
    { "id": "build", "status": "done", "startedAt": "2026-08-28T09:32:32+04:00", "finishedAt": "2026-08-28T10:13:04+04:00" },
    { "id": "review", "status": "done", "startedAt": "2026-08-28T09:51:26+04:00", "finishedAt": "2026-08-28T10:13:04+04:00", "note": "проверено 8 из 8" },
    { "id": "final", "status": "done", "startedAt": "2026-08-28T10:13:04+04:00", "finishedAt": "2026-08-28T10:16:43+04:00" }
  ],
  "requirements": {
    "total": 32, "done": 31, "inTicket": 0, "inSpec": 0,
    "placeholder": 0, "deferred": 0, "dropped": 1
  },
  "tickets": [
    { "id": "01", "title": "Общие UI-правки", "requirements": ["R01", "R02", "R05", "R16", "R32"], "blockedBy": [], "wave": 1, "zone": ["frontend/src/components/", "frontend/src/app/"], "status": "done", "startedAt": "2026-08-28T09:38:37+04:00", "finishedAt": "2026-08-28T10:08:11+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "commit": "70b8312", "tests": {"passed": 2, "failed": 0} },
    { "id": "02", "title": "Present Simple: теория, песни, фильтр и задания", "requirements": ["R03", "R04", "R06", "R07", "R08", "R09"], "blockedBy": [], "wave": 1, "zone": ["content/epochs/present-simple/", "frontend/src/components/EpochTheory.tsx", "frontend/src/app/music/"], "status": "done", "startedAt": "2026-08-28T09:38:37+04:00", "finishedAt": "2026-08-28T10:08:11+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "commit": "9234cba", "tests": {"passed": 2, "failed": 0} },
    { "id": "03", "title": "Present Continuous: нумерация семи ситуаций", "requirements": ["R10"], "blockedBy": [], "wave": 1, "zone": ["content/epochs/present-continuous/"], "status": "done", "startedAt": "2026-08-28T09:38:37+04:00", "finishedAt": "2026-08-28T10:08:11+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "commit": "d227ccc", "tests": {"passed": 1, "failed": 0} },
    { "id": "04", "title": "Past Simple: тренажёр, текст и промпт", "requirements": ["R11", "R12", "R13", "R14"], "blockedBy": [], "wave": 1, "zone": ["content/epochs/past-simple/"], "status": "done", "startedAt": "2026-08-28T09:38:37+04:00", "finishedAt": "2026-08-28T10:08:11+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "commit": "bd1c6a0", "tests": {"passed": 2, "failed": 0} },
    { "id": "05", "title": "Past Continuous: один пропуск и монологи", "requirements": ["R15", "R17"], "blockedBy": [], "wave": 1, "zone": ["content/epochs/past-continuous/"], "status": "done", "startedAt": "2026-08-28T09:51:26+04:00", "finishedAt": "2026-08-28T10:08:11+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "commit": "c047d09", "tests": {"passed": 1, "failed": 0} },
    { "id": "06", "title": "Present Perfect B1: пропуски, подсказки и перевод", "requirements": ["R18", "R19", "R20"], "blockedBy": [], "wave": 1, "zone": ["content/epochs/present-perfect/b1/"], "status": "done", "startedAt": "2026-08-28T09:51:26+04:00", "finishedAt": "2026-08-28T10:08:11+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "commit": "4fa951c", "tests": {"passed": 1, "failed": 0} },
    { "id": "07", "title": "Perfect Continuous + Future: чистка пустых станций и FPC-ответы", "requirements": ["R21", "R22", "R23", "R24", "R25", "R27", "R28", "R29", "R30", "R31"], "blockedBy": [], "wave": 1, "zone": ["content/epochs/present-perfect-continuous/", "content/epochs/past-perfect-continuous/", "content/epochs/future-simple/", "content/epochs/future-perfect/", "content/epochs/future-perfect-continuous/"], "status": "done", "startedAt": "2026-08-28T09:51:26+04:00", "finishedAt": "2026-08-28T10:08:11+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "commit": "c1dc1ef", "tests": {"passed": 3, "failed": 0} },
    { "id": "08", "title": "Финальная проверка пакета", "requirements": ["R01", "R02", "R03", "R04", "R05", "R06", "R07", "R08", "R09", "R10", "R11", "R12", "R13", "R14", "R15", "R16", "R17", "R18", "R19", "R20", "R21", "R22", "R23", "R24", "R25", "R27", "R28", "R29", "R30", "R31", "R32"], "blockedBy": ["01", "02", "03", "04", "05", "06", "07"], "wave": 2, "zone": ["content/", "frontend/"], "status": "done", "startedAt": "2026-08-28T10:08:11+04:00", "finishedAt": "2026-08-28T10:13:04+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "tests": {"passed": 4, "failed": 0} }
  ],
  "singlePass": null,
  "tests": {"passed": 16, "failed": 0},
  "debt": { "placeholders": [], "assumptions": [], "emptyEnv": [] },
  "additions": [],
  "coverage": {"findings": 2, "action": "R21/R29 - уточнено удаление 5 из PPC; R10 - уточнено что только нумерация PC без копий"},
  "concerns": [],
  "reviewers": { "manifestSpec": null, "craft": null },
  "blind": {"status": "pass", "note": "32 требования: 31 done, 1 dropped (R26 — оставлен диалог по решению пользователя)"}
}
