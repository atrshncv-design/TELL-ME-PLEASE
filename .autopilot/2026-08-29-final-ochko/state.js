window.STATE =
{
  "slug": "final-ochko",
  "dir": "2026-08-29-final-ochko",
  "title": "ЕБАТЬ ФИНАЛ В ОЧКО — правки ФИНАЛ 3",
  "mode": "semi",
  "depth": "normal",
  "polish": null,
  "tier": "T2",
  "briefFile": "2026-08-29-brief.md",
  "memoryFile": "AGENTS.md",
  "skillDir": "/Users/aleksandrtrisenkov/.agents/skills/autopilot",
  "startedAt": "2026-08-29T21:39:54+04:00",
  "updatedAt": "2026-08-29T22:10:18+04:00",
  "finishedAt": "2026-08-29T22:10:18+04:00",
  "stages": [
    { "id": "preflight", "status": "done", "startedAt": "2026-08-29T21:39:54+04:00", "finishedAt": "2026-08-29T21:41:43+04:00" },
    { "id": "manifest", "status": "done", "startedAt": "2026-08-29T21:41:43+04:00", "finishedAt": "2026-08-29T21:43:06+04:00" },
    { "id": "briefing", "status": "done", "startedAt": "2026-08-29T21:43:06+04:00", "finishedAt": "2026-08-29T21:43:06+04:00" },
    { "id": "spec", "status": "done", "startedAt": "2026-08-29T21:43:06+04:00", "finishedAt": "2026-08-29T21:48:41+04:00" },
    { "id": "plan", "status": "done", "startedAt": "2026-08-29T21:48:41+04:00", "finishedAt": "2026-08-29T21:48:41+04:00", "note": "4 таска, ярус T2" },
    { "id": "build", "status": "done", "startedAt": "2026-08-29T21:48:41+04:00", "finishedAt": "2026-08-29T22:09:27+04:00" },
    { "id": "review", "status": "done", "startedAt": "2026-08-29T22:06:05+04:00", "finishedAt": "2026-08-29T22:09:27+04:00", "note": "проверено 4 из 4" },
    { "id": "final", "status": "done", "startedAt": "2026-08-29T22:09:27+04:00", "finishedAt": "2026-08-29T22:10:18+04:00" }
  ],
  "requirements": {
    "total": 9, "done": 9, "inTicket": 0, "inSpec": 0,
    "placeholder": 0, "deferred": 0, "dropped": 0
  },
  "tickets": [
    { "id": "01", "title": "DnD: noon×3, ошибки и задержка экрана", "requirements": ["R01", "R02", "R03", "R07"], "blockedBy": [], "wave": 1, "zone": ["content/epochs/future-perfect/", "frontend/src/components/tasks/DragAndDropTask.tsx"], "status": "done", "startedAt": "2026-08-29T21:51:05+04:00", "finishedAt": "2026-08-29T22:06:05+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "commit": "f431ba6", "tests": {"passed": 2, "failed": 0} },
    { "id": "02", "title": "Стрелки и перевод с have", "requirements": ["R04", "R09"], "blockedBy": [], "wave": 1, "zone": ["content/epochs/present-perfect/b1/", "frontend/src/components/tasks/FillInTask.tsx", "frontend/src/components/tasks/QuizTask.tsx"], "status": "done", "startedAt": "2026-08-29T21:51:05+04:00", "finishedAt": "2026-08-29T22:06:05+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "commit": "73831c3", "tests": {"passed": 2, "failed": 0} },
    { "id": "03", "title": "Визуал и футер", "requirements": ["R05", "R06"], "blockedBy": [], "wave": 1, "zone": ["content/epochs/*/index.json", "frontend/src/components/EpochTheory.tsx", "frontend/src/components/RightsFooter.tsx"], "status": "done", "startedAt": "2026-08-29T21:51:05+04:00", "finishedAt": "2026-08-29T22:06:05+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "tests": {"passed": 2, "failed": 0} },
    { "id": "04", "title": "Финальная проверка ФИНАЛ 3", "requirements": ["R01", "R02", "R03", "R04", "R05", "R06", "R07", "R08", "R09"], "blockedBy": ["01", "02", "03"], "wave": 2, "zone": ["content/", "frontend/"], "status": "done", "startedAt": "2026-08-29T22:06:05+04:00", "finishedAt": "2026-08-29T22:09:27+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "tests": {"passed": 4, "failed": 0} }
  ],
  "singlePass": null,
  "tests": {"passed": 10, "failed": 0},
  "debt": { "placeholders": [], "assumptions": [], "emptyEnv": [] },
  "additions": [],
  "coverage": {"findings": 0, "fixed": 0},
  "concerns": [],
  "reviewers": { "manifestSpec": null, "craft": null },
  "blind": {"status": "pass", "note": "9/9 done"}
}
