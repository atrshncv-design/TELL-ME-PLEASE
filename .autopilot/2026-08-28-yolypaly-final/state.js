window.STATE =
{
  "slug": "yolypaly-final",
  "dir": "2026-08-28-yolypaly-final",
  "title": "Финал ЁЛЫПАЛЫ — повторные правки клиентки",
  "mode": "semi",
  "depth": "normal",
  "polish": null,
  "tier": "T2",
  "briefFile": "2026-08-28-brief.md",
  "memoryFile": "AGENTS.md",
  "skillDir": "/Users/aleksandrtrisenkov/.agents/skills/autopilot",
  "startedAt": "2026-08-28T14:55:03+04:00",
  "updatedAt": "2026-08-28T16:19:41+04:00",
  "finishedAt": "2026-08-28T16:19:41+04:00",
  "stages": [
    { "id": "preflight", "status": "done", "startedAt": "2026-08-28T14:55:03+04:00", "finishedAt": "2026-08-28T14:56:56+04:00" },
    { "id": "manifest", "status": "done", "startedAt": "2026-08-28T14:56:56+04:00", "finishedAt": "2026-08-28T14:59:42+04:00" },
    { "id": "briefing", "status": "done", "startedAt": "2026-08-28T14:59:42+04:00", "finishedAt": "2026-08-28T15:29:14+04:00" },
    { "id": "spec", "status": "done", "startedAt": "2026-08-28T15:29:14+04:00", "finishedAt": "2026-08-28T15:33:45+04:00" },
    { "id": "plan", "status": "done", "startedAt": "2026-08-28T15:33:45+04:00", "finishedAt": "2026-08-28T15:39:18+04:00", "note": "7 тасков, ярус T2" },
    { "id": "build", "status": "done", "startedAt": "2026-08-28T15:39:18+04:00", "finishedAt": "2026-08-28T16:19:02+04:00" },
    { "id": "review", "status": "done", "startedAt": "2026-08-28T16:05:21+04:00", "finishedAt": "2026-08-28T16:19:02+04:00", "note": "проверено 7 из 7" },
    { "id": "final", "status": "done", "startedAt": "2026-08-28T16:19:02+04:00", "finishedAt": "2026-08-28T16:19:41+04:00" }
  ],
  "requirements": {
    "total": 20, "done": 20, "inTicket": 0, "inSpec": 0,
    "placeholder": 0, "deferred": 0, "dropped": 0
  },
  "tickets": [
    { "id": "01", "title": "UI: рамка TO BE, цвет вердикта и экзамен на миссии", "requirements": ["R01", "R02", "R16"], "blockedBy": [], "wave": 1, "zone": ["frontend/src/components/", "frontend/src/app/mission/", "content/epochs/present-simple/"], "status": "done", "startedAt": "2026-08-28T15:42:38+04:00", "finishedAt": "2026-08-28T16:05:21+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "commit": "b695415", "tests": {"passed": 2, "failed": 0} },
    { "id": "02", "title": "Past Simple: убрать таблицу и поправить викторину", "requirements": ["R03", "R04"], "blockedBy": [], "wave": 1, "zone": ["content/epochs/past-simple/"], "status": "done", "startedAt": "2026-08-28T15:42:38+04:00", "finishedAt": "2026-08-28T16:05:21+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "commit": "392ce03", "tests": {"passed": 2, "failed": 0} },
    { "id": "03", "title": "Present Perfect B1: рекордер, проблема и перевод", "requirements": ["R06", "R07", "R08", "R09"], "blockedBy": [], "wave": 1, "zone": ["content/epochs/present-perfect/b1/"], "status": "done", "startedAt": "2026-08-28T15:42:38+04:00", "finishedAt": "2026-08-28T16:05:21+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "commit": "df5b67b", "tests": {"passed": 2, "failed": 0} },
    { "id": "04", "title": "PPC и Future Simple: дубли и мини-проект", "requirements": ["R05", "R10", "R11", "R12", "R13", "R14"], "blockedBy": [], "wave": 1, "zone": ["content/epochs/present-perfect-continuous/", "content/epochs/past-continuous/", "content/epochs/future-simple/"], "status": "done", "startedAt": "2026-08-28T16:05:21+04:00", "finishedAt": "2026-08-28T16:19:02+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "commit": "9a39390", "tests": {"passed": 2, "failed": 0} },
    { "id": "05", "title": "Future Perfect A1: BY/AT без подсказок", "requirements": ["R15"], "blockedBy": [], "wave": 1, "zone": ["content/epochs/future-perfect/"], "status": "done", "startedAt": "2026-08-28T16:05:21+04:00", "finishedAt": "2026-08-28T16:19:02+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "commit": "c0028c3", "tests": {"passed": 1, "failed": 0} },
    { "id": "06", "title": "Великий экзамен: матрица, архивы, горизонт", "requirements": ["R17", "R18", "R19", "R20"], "blockedBy": [], "wave": 1, "zone": ["content/exam/", "frontend/src/app/exam/"], "status": "done", "startedAt": "2026-08-28T16:05:21+04:00", "finishedAt": "2026-08-28T16:19:02+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "commit": "3c66454", "tests": {"passed": 2, "failed": 0} },
    { "id": "07", "title": "Финальная проверка пака ЁЛЫПАЛЫ", "requirements": ["R01", "R02", "R03", "R04", "R05", "R06", "R07", "R08", "R09", "R10", "R11", "R12", "R13", "R14", "R15", "R16", "R17", "R18", "R19", "R20"], "blockedBy": ["01", "02", "03", "04", "05", "06"], "wave": 2, "zone": ["content/", "frontend/"], "status": "done", "startedAt": "2026-08-28T16:19:02+04:00", "finishedAt": "2026-08-28T16:19:02+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "tests": {"passed": 4, "failed": 0} }
  ],
  "singlePass": null,
  "tests": {"passed": 15, "failed": 0},
  "debt": { "placeholders": [], "assumptions": [], "emptyEnv": [] },
  "additions": [],
  "coverage": {"findings": 2, "fixed": 2},
  "concerns": [],
  "reviewers": { "manifestSpec": null, "craft": null },
  "blind": {"status": "pass", "note": "20/20 требований прошло слепую проверку"}
}
