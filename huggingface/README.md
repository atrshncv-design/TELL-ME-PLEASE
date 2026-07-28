---
title: TELL ME PLEASE
emoji: 🎓
colorFrom: indigo
colorTo: violet
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# TELL ME PLEASE — backend (FastAPI + WebSocket + Kokoro TTS)

This HF Space runs the **FastAPI backend** of the TELL ME PLEASE voice platform:
- `wss://<this-space>.hf.space/ws/chat` — voice chat (STT → LLM → TTS streaming)
- `https://<this-space>.hf.space/api/event` — anonymous funnel analytics
- `https://<this-space>.hf.space/admin/status` — Basic-Auth admin status
- `https://<this-space>.hf.space/health` — health check

The **Next.js frontend** is deployed separately (z.ai / Vercel / Netlify) and
points at this Space via `NEXT_PUBLIC_WS_URL` and `NEXT_PUBLIC_API_BASE`.

## Required secrets (Settings → Repository secrets)

| Name | Example |
|---|---|
| `LLM_API_KEYS` | `sk-xxx,sk-yyy` (OpenCode Zen, comma-separated) |
| `ADMIN_PASSWORD` | your admin password for `/admin/*` |

Optional env (defaults shown):
- `LLM_MODEL=ling-3.0-flash-free`
- `LLM_MODELS=ling-3.0-flash-free,nemotron-3-ultra-free`
- `LLM_API_BASE=https://opencode.ai/zen/v1`
- `TTS_VOICE=af_bella`
- `SESSION_TIMEOUT=180`

## Source

- App code: `app/` (FastAPI services, prompts, analytics, TTS)
- Full source repo: https://github.com/atrshncv-design/TELL-ME-PLEASE
