window.STATE =
{
  "slug": "epoch-map-redesign",
  "dir": "2026-08-27-epoch-map-redesign",
  "title": "Карта эпох: визуальный редизайн по плакату клиентки",
  "mode": "interview",
  "depth": "normal",
  "polish": null,
  "tier": "T1",
  "briefFile": "2026-08-27-brief.md",
  "memoryFile": "AGENTS.md",
  "skillDir": "/Users/aleksandrtrisenkov/.agents/skills/autopilot",
  "startedAt": "2026-08-27T11:18:30+04:00",
  "updatedAt": "2026-08-27T16:15:00+04:00",
  "finishedAt": "2026-08-27T16:15:00+04:00",
  "stages": [
    {
      "id": "preflight",
      "status": "done",
      "startedAt": "2026-08-27T11:18:30+04:00",
      "finishedAt": "2026-08-27T11:19:20+04:00"
    },
    {
      "id": "manifest",
      "status": "done",
      "startedAt": "2026-08-27T11:19:20+04:00",
      "finishedAt": "2026-08-27T14:15:00+04:00"
    },
    {
      "id": "briefing",
      "status": "done",
      "startedAt": "2026-08-27T11:19:20+04:00",
      "finishedAt": "2026-08-27T14:15:00+04:00"
    },
    {
      "id": "spec",
      "status": "active",
      "startedAt": "2026-08-27T14:15:00+04:00"
    },
    {
      "id": "plan",
      "status": "pending"
    },
    {
      "id": "build",
      "status": "pending"
    },
    {
      "id": "review",
      "status": "pending"
    },
    {
      "id": "final",
      "status": "pending"
    }
  ],
  "requirements": {
    "total": 11,
    "done": 2,
    "inTicket": 0,
    "inSpec": 9,
    "placeholder": 0,
    "deferred": 0,
    "dropped": 0
  },
  "tickets": [
    { "id": "01", "title": "Плакат-ассет, метаданные эпох, компонент карты", "requirements": ["R01","R02","R02.1","R05i","R06i","G01","G04"], "blockedBy": [], "wave": 1, "zone": ["frontend/src/lib/epochs-meta.ts","frontend/src/components/EpochMapPoster.tsx","frontend/public/map/"], "status": "done", "startedAt": "2026-08-27T14:24:00+04:00", "finishedAt": "2026-08-27T14:50:00+04:00", "commit": "5dfc845", "tests": {"passed": 2, "failed": 0}, "startedAt": "2026-08-27T14:24:00+04:00", "retries": 0, "repairs": 0, "handoffs": 0 },
    { "id": "02", "title": "/mission: плакат на ПК, список на телефоне, подвал, без экзамена", "requirements": ["R01","R07i","G02","G03.1"], "blockedBy": ["01"], "wave": 2, "zone": ["frontend/src/app/mission/page.tsx","frontend/src/app/page.tsx","frontend/src/components/RightsFooter.tsx"], "status": "done", "startedAt": "2026-08-27T14:26:00+04:00", "finishedAt": "2026-08-27T14:50:00+04:00", "commit": "4c51b05", "tests": {"passed": 2, "failed": 0}, "startedAt": "2026-08-27T14:26:00+04:00", "retries": 0, "repairs": 0, "handoffs": 0 },
    { "id": "03", "title": "Вход на экзамен со страницы FPC", "requirements": ["G03","G03.1"], "blockedBy": [], "wave": 1, "zone": ["frontend/src/app/epoch/"], "status": "done", "startedAt": "2026-08-27T14:24:00+04:00", "finishedAt": "2026-08-27T14:50:00+04:00", "commit": "bb4a1cd", "tests": {"passed": 2, "failed": 0}, "startedAt": "2026-08-27T14:24:00+04:00", "retries": 0, "repairs": 0, "handoffs": 0 }
  ],
  "singlePass": null,
  "tests": {"passed": 6, "failed": 0},
  "debt": {
    "placeholders": [],
    "assumptions": [],
    "emptyEnv": []
  },
  "additions": [],
  "coverage": {"findings": 10, "halfCovered": 3, "specOnly": 7, "action": "порог пройдено уточнён у пользователя (все 4 сектора); видимость подвала сделана проверяемой; галочка только на ПК; остальные — осознанные R##.n"},
  "concerns": ["EpochMapPoster без AbortController (T01 craft)", "mission outer max-w-6xl — craft-стилистика"],
  "reviewers": {
    "manifestSpec": null,
    "craft": null
  },
  "blind": {"by": "brief-only", "status": "pass", "note": "все 10 требований реализованы (см. отчёт), tsc 0, build ok"}
}
