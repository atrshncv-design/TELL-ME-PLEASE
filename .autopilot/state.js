window.STATE =
{
  "slug": "tester-ux-fixes",
  "title": "Правки UX по обратной связи тестировщика (Verb Bot, шапка, звук, фидбек ответов)",
  "mode": "semi",
  "depth": "normal",
  "polish": null,
  "tier": "T2",
  "briefFile": "2026-08-26-brief.md",
  "memoryFile": "AGENTS.md",
  "startedAt": "2026-08-26T14:46:18+04:00",
  "updatedAt": "2026-08-26T17:40:00+04:00",
  "finishedAt": "2026-08-26T17:40:00+04:00",
  "stages": [
    {
      "id": "preflight",
      "status": "done",
      "startedAt": "2026-08-26T14:46:18+04:00",
      "finishedAt": "2026-08-26T14:55:00+04:00"
    },
    {
      "id": "manifest",
      "status": "done",
      "startedAt": "2026-08-26T14:47:00+04:00",
      "finishedAt": "2026-08-26T14:55:00+04:00"
    },
    {
      "id": "briefing",
      "status": "done",
      "startedAt": "2026-08-26T14:55:00+04:00",
      "finishedAt": "2026-08-26T15:05:00+04:00"
    },
    {
      "id": "spec",
      "status": "done",
      "startedAt": "2026-08-26T15:05:00+04:00",
      "finishedAt": "2026-08-26T15:12:00+04:00"
    },
    {
      "id": "plan",
      "status": "done",
      "startedAt": "2026-08-26T15:12:00+04:00",
      "finishedAt": "2026-08-26T15:20:00+04:00",
      "note": "ярус T2 — 4 таска, одна волна"
    },
    {
      "id": "build",
      "status": "done",
      "startedAt": "2026-08-26T15:20:00+04:00",
      "finishedAt": "2026-08-26T16:50:00+04:00",
      "note": "4 из 4 тасков готовы"
    },
    {
      "id": "review",
      "status": "done",
      "finishedAt": "2026-08-26T16:50:00+04:00"
    },
    {
      "id": "final",
      "status": "done",
      "startedAt": "2026-08-26T16:55:00+04:00",
      "finishedAt": "2026-08-26T17:40:00+04:00"
    }
  ],
  "requirements": {
    "total": 6,
    "done": 6,
    "inTicket": 0,
    "inSpec": 0,
    "placeholder": 0,
    "deferred": 0,
    "dropped": 0
  },
  "tickets": [
    {
      "id": "01",
      "title": "Verb Bot: голосовой чат по клику + место под бота",
      "requirements": [
        "R01",
        "R02"
      ],
      "blockedBy": [],
      "wave": 1,
      "zone": [
        "components/VerbBot.tsx",
        "components/BotChatModal.tsx",
        "app/layout.tsx"
      ],
      "status": "done",
      "retries": 1,
      "startedAt": "2026-08-26T15:26:00+04:00",
      "finishedAt": "2026-08-26T16:55:00+04:00",
      "commit": "fdbfd28",
      "tests": {
        "tsc": "0 errors",
        "build": "success"
      }
    },
    {
      "id": "02",
      "title": "Звук: единый речевой гейт",
      "requirements": [
        "R04"
      ],
      "blockedBy": [],
      "wave": 1,
      "zone": [
        "lib/useSound.ts",
        "lib/useSpeechSynthesis.ts",
        "lib/useServerTts.ts"
      ],
      "status": "done",
      "retries": 0,
      "startedAt": "2026-08-26T15:26:00+04:00",
      "finishedAt": "2026-08-26T16:55:00+04:00",
      "commit": "1c4249b",
      "tests": {
        "tsc": "0 errors",
        "build": "success"
      }
    },
    {
      "id": "03",
      "title": "Вердикт мгновенной проверки",
      "requirements": [
        "R05"
      ],
      "blockedBy": [],
      "wave": 1,
      "zone": [
        "components/tasks/QuizTask.tsx",
        "components/tasks/verdict.ts",
        "instant-check siblings"
      ],
      "status": "done",
      "retries": 1,
      "startedAt": "2026-08-26T15:26:00+04:00",
      "finishedAt": "2026-08-26T16:55:00+04:00",
      "commit": "c23d9df",
      "tests": {
        "tsc": "0 errors",
        "build": "success"
      }
    },
    {
      "id": "04",
      "title": "Мелкие коллизии UI: шапка + обучение",
      "requirements": [
        "R03",
        "R06"
      ],
      "blockedBy": [],
      "wave": 1,
      "zone": [
        "components/tasks/TaskHeader.tsx",
        "components/EpochTheory.tsx",
        "components/SoundToggle.tsx"
      ],
      "status": "done",
      "retries": 0,
      "startedAt": "2026-08-26T15:52:00+04:00",
      "finishedAt": "2026-08-26T16:55:00+04:00",
      "commit": "535dacb",
      "tests": {
        "tsc": "0 errors",
        "build": "success"
      }
    }
  ],
  "singlePass": null,
  "tests": {
    "tsc": "0 errors",
    "build": "success"
  },
  "debt": {
    "placeholders": [],
    "assumptions": [
      "craft: возможное дублирование механики чата с VoiceChatTask и подписки на гейт в двух хуках — вынесено в отчёт, рефакторинг вне тасков"
    ],
    "emptyEnv": []
  },
  "additions": [],
  "coverage": {
    "findings": 2,
    "resolved": "half-covered(форма чата)=решение брифинга G01; лишнего в спеке=углубления R##.n по правилам глубины; поправлена ссылка §R02"
  },
  "blind": {
    "verdict": "6/6 пунктов жалобы реализованы; найден и исправлен критичный drift — 500 на всех станциях эпох (клиентский контекст в серверном компоненте); пункт про зелёную галочку в отложенно-проверяемых заданиях — осознанный скоуп спеки (только instant-check)"
  }
}