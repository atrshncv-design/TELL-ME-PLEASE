window.STATE =
{
  "slug": "pravki-080926",
  "dir": "2026-09-08-pravki-080926--wip",
  "title": "Правки 080926 — маркеры, кнопка сектора, фильтр",
  "mode": "semi",
  "depth": "normal",
  "polish": null,
  "tier": "T1",
  "briefFile": "2026-09-08-brief.md",
  "memoryFile": "AGENTS.md",
  "skillDir": "/Users/aleksandrtrisenkov/.agents/skills/autopilot",
  "startedAt": "2026-09-08T07:56:00+04:00",
  "updatedAt": "2026-09-08T08:30:00+04:00",
  "finishedAt": null,
  "stages": [
    { "id": "preflight", "status": "done", "startedAt": "2026-09-08T07:56:00+04:00", "finishedAt": "2026-09-08T07:56:00+04:00" },
    { "id": "manifest", "status": "done", "startedAt": "2026-09-08T07:56:00+04:00", "finishedAt": "2026-09-08T07:56:00+04:00" },
    { "id": "briefing", "status": "done", "startedAt": "2026-09-08T07:56:00+04:00", "finishedAt": "2026-09-08T08:00:00+04:00", "note": "3 вопроса" },
    { "id": "spec", "status": "done", "startedAt": "2026-09-08T08:00:00+04:00", "finishedAt": "2026-09-08T08:05:00+04:00" },
    { "id": "plan", "status": "done", "startedAt": "2026-09-08T08:05:00+04:00", "finishedAt": "2026-09-08T08:08:00+04:00", "note": "3 таска, ярус T1" },
    { "id": "build", "status": "done", "startedAt": "2026-09-08T08:10:00+04:00", "finishedAt": "2026-09-08T08:30:00+04:00", "note": "3 из 3 тасков готовы" },
    { "id": "review", "status": "done", "startedAt": "2026-09-08T08:20:00+04:00", "finishedAt": "2026-09-08T08:30:00+04:00", "note": "проверено 3 из 3" },
    { "id": "final", "status": "pending" }
  ],
  "requirements": {
    "total": 6, "done": 6, "inTicket": 0, "inSpec": 0,
    "placeholder": 0, "deferred": 0, "dropped": 0
  },
  "tickets": [
    { "id": "01", "title": "Кнопка перехода в конце сектора", "requirements": ["R02","R03"], "blockedBy": [], "wave": 1, "zone": ["sector-page"], "status": "done", "startedAt": "2026-09-08T08:10:00+04:00", "finishedAt": "2026-09-08T08:30:00+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "commit": null },
    { "id": "02", "title": "Маркеры и фильтр to be", "requirements": ["R01","R05","R06"], "blockedBy": [], "wave": 1, "zone": ["content"], "status": "done", "startedAt": "2026-09-08T08:10:00+04:00", "finishedAt": "2026-09-08T08:30:00+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "commit": null },
    { "id": "03", "title": "Список правок анкет", "requirements": ["R04"], "blockedBy": [], "wave": 1, "zone": ["docs"], "status": "done", "startedAt": "2026-09-08T08:10:00+04:00", "finishedAt": "2026-09-08T08:30:00+04:00", "retries": 0, "repairs": 0, "handoffs": 0, "commit": null }
  ],
  "singlePass": null,
  "tests": null,
  "debt": { "placeholders": [], "assumptions": [], "emptyEnv": [] },
  "additions": [],
  "coverage": { "found": 0, "fixed": 0, "deferred": 0, "note": "G2: пропусков нет" },
  "concerns": ["крафт: крайнее условие дублируется в goNext и label кнопки сектора"],
  "reviewers": { "manifestSpec": null, "craft": null },
  "blind": null
}
