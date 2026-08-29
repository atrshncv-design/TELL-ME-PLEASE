window.STATE =
{
  "slug": "visual-paragraphs",
  "dir": "2026-08-29-visual-paragraphs",
  "title": "Визуально красивое обучение — абзацы и правки 290826",
  "mode": "semi",
  "depth": "normal",
  "polish": null,
  "tier": "T2",
  "briefFile": "2026-08-29-brief.md",
  "memoryFile": "AGENTS.md",
  "skillDir": "/Users/aleksandrtrisenkov/.agents/skills/autopilot",
  "startedAt": "2026-08-29T11:24:58+04:00",
  "updatedAt": "2026-08-29T12:11:52+04:00",
  "finishedAt": "2026-08-29T12:11:52+04:00",
  "stages": [
    { "id": "preflight", "status": "done", "startedAt": "2026-08-29T11:24:58+04:00", "finishedAt": "2026-08-29T11:27:38+04:00" },
    { "id": "manifest", "status": "done", "startedAt": "2026-08-29T11:27:38+04:00", "finishedAt": "2026-08-29T11:29:27+04:00" },
    { "id": "briefing", "status": "done", "startedAt": "2026-08-29T11:29:27+04:00", "finishedAt": "2026-08-29T11:38:26+04:00" },
    { "id": "spec", "status": "done", "startedAt": "2026-08-29T11:38:26+04:00", "finishedAt": "2026-08-29T11:43:22+04:00" },
    { "id": "plan", "status": "done", "startedAt": "2026-08-29T11:43:22+04:00", "finishedAt": "2026-08-29T11:45:44+04:00", "note": "4 таска, ярус T2" },
    { "id": "build", "status": "done", "startedAt": "2026-08-29T11:45:44+04:00", "finishedAt": "2026-08-29T12:11:22+04:00" },
    { "id": "review", "status": "done", "startedAt": "2026-08-29T12:09:52+04:00", "finishedAt": "2026-08-29T12:11:22+04:00", "note": "проверено 4 из 4" },
    { "id": "final", "status": "done", "startedAt": "2026-08-29T12:11:22+04:00", "finishedAt": "2026-08-29T12:11:52+04:00" }
  ],
  "requirements": {
    "total": 17, "done": 17, "inTicket": 0, "inSpec": 0,
    "placeholder": 0, "deferred": 0, "dropped": 0
  },
  "tickets": [
    { "id": "01", "title": "Визуально красивое обучение", "requirements": ["R01", "R02"], "blockedBy": [], "wave": 1, "zone": ["content/epochs/*/index.json", "frontend/src/components/EpochTheory.tsx"], "status": "done", "startedAt": "2026-08-29T11:47:53+04:00", "finishedAt": "2026-08-29T12:09:52+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "commit": "0940304", "tests": {"passed": 2, "failed": 0} },
    { "id": "02", "title": "Noon×3, футер и стрелки", "requirements": ["R10", "R11", "R12"], "blockedBy": [], "wave": 1, "zone": ["content/epochs/future-perfect/", "frontend/src/components/tasks/DragAndDropTask.tsx", "frontend/src/components/RightsFooter.tsx", "frontend/src/components/tasks/QuizTask.tsx"], "status": "done", "startedAt": "2026-08-29T11:47:53+04:00", "finishedAt": "2026-08-29T12:09:52+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "commit": "07a6327", "tests": {"passed": 2, "failed": 0} },
    { "id": "03", "title": "Present Perfect: перевод и подпись", "requirements": ["R09", "R13"], "blockedBy": [], "wave": 1, "zone": ["content/epochs/present-perfect/b1/"], "status": "done", "startedAt": "2026-08-29T11:47:53+04:00", "finishedAt": "2026-08-29T12:09:52+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "commit": "763dbf3", "tests": {"passed": 2, "failed": 0} },
    { "id": "04", "title": "Финальная проверка 290826", "requirements": ["R01", "R02", "R03", "R04", "R05", "R06", "R07", "R08", "R09", "R10", "R11", "R12", "R13", "R14", "R15", "R16", "R17"], "blockedBy": ["01", "02", "03"], "wave": 2, "zone": ["content/", "frontend/"], "status": "done", "startedAt": "2026-08-29T12:11:22+04:00", "finishedAt": "2026-08-29T12:11:22+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "tests": {"passed": 4, "failed": 0} }
  ],
  "singlePass": null,
  "tests": {"passed": 10, "failed": 0},
  "debt": { "placeholders": [], "assumptions": [], "emptyEnv": [] },
  "additions": [],
  "coverage": {"findings": 0, "fixed": 0},
  "concerns": [],
  "reviewers": { "manifestSpec": null, "craft": null },
  "blind": {"status": "pass", "note": "17/17 done"}
}
