/**
 * GET /api/tts?text=…&voice=… → MP3 (audio/mpeg).
 *
 * Гибридный БЕСПЛАТНЫЙ TTS без ключей (Q6, тикет W4-T04 «озвучка во всех
 * браузерах»): серверный фолбэк для Яндекс-браузера, где Web Speech API не
 * даёт английских голосов.
 *
 *   Провайдер №1 — npm `edge-tts` (Microsoft Edge TTS, WebSocket, без ключей).
 *     ⚠️ Пакет использует ХАРДКОД-токен (TrustedClientToken), который Microsoft
 *     периодически отзывает — при 403/сетевой ошибке/таймауте автоматически
 *     переходим на провайдера №2.
 *   Провайдер №2 (фолбэк) — translate.google.com/translate_tts (бесплатно,
 *     без ключа). Ограничение ~200 символов на запрос — текст режется по
 *     границам предложений, MP3-куски склеиваются в один ответ.
 *
 * Кэш: in-memory LRU (MAX_CACHE записей) — повторные запросы не дёргают
 * сервисы. Ответ кэшируется и на стороне браузера (Cache-Control public).
 *
 * Валидация: text ≤ 500 символов, voice из белого списка → иначе 400.
 * Оба провайдера недоступны → 503 {error: "tts unavailable"} (клиент молчит,
 * текст ответа всё равно виден на экране).
 */
import { Buffer } from "node:buffer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ALLOWED_VOICES = new Set(["en-GB-SoniaNeural", "en-US-AriaNeural", "en-GB-LibbyNeural"])
const DEFAULT_VOICE = "en-GB-SoniaNeural"
const MAX_TEXT_LENGTH = 500
const MAX_CACHE = 200
const CACHE_MAX_AGE = 86400
/** Google translate_tts режет текст ~200 символов — куски по границам предложений. */
const GOOGLE_CHUNK = 200
const EDGE_TTS_TIMEOUT_MS = 10_000

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" }

/** LRU-кэш MP3: Map хранит порядок вставки — первый ключ = самый старый. */
const cache = new Map<string, Buffer>()

function cacheGet(key: string): Buffer | undefined {
  const hit = cache.get(key)
  if (hit !== undefined) {
    // Refresh LRU: перевставить в конец (недавно использованные живут дольше)
    cache.delete(key)
    cache.set(key, hit)
  }
  return hit
}

function cacheSet(key: string, buf: Buffer) {
  cache.delete(key)
  cache.set(key, buf)
  while (cache.size > MAX_CACHE) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) break
    cache.delete(oldest)
  }
}

/** Режем текст для google translate_tts по границам предложений (≤GOOGLE_CHUNK). */
function splitForGoogle(text: string, max = GOOGLE_CHUNK): string[] {
  const chunks: string[] = []
  let rest = text.replace(/\s+/g, " ").trim()
  while (rest.length > max) {
    let cut = -1
    for (let i = max; i > 0; i--) {
      // Граница: знак конца предложения + пробел после него (не «Mr. Smith»)
      if (/[.!?…]/.test(rest[i - 1] ?? "") && rest[i] === " ") {
        cut = i
        break
      }
    }
    if (cut === -1) cut = max
    chunks.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }
  if (rest) chunks.push(rest)
  return chunks
}

/** Таймаут для edge-tts (WS может зависнуть без ответа). */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`edge-tts timeout after ${ms}ms`)), ms)
    p.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      },
    )
  })
}

/**
 * Провайдер №1: npm edge-tts.
 * Динамический импорт (пакет тянет ws и не должен попадать в клиентский
 * бандл); путь out/index.js — compiled JS + .d.ts (main пакета указывает на
 * index.ts-исходник, что ненадёжно для бандлера).
 */
let edgeTtsPromise: Promise<typeof import("edge-tts/out/index.js")> | null = null
function loadEdgeTts(): Promise<typeof import("edge-tts/out/index.js")> {
  edgeTtsPromise ??= import("edge-tts/out/index.js")
  return edgeTtsPromise
}

/**
 * Провайдер №2: google translate_tts (фолбэк).
 * tl: en-gb для британских голосов, en для американских.
 */
async function googleTts(text: string, voice: string): Promise<Buffer> {
  const tl = voice.startsWith("en-GB") ? "en-gb" : "en"
  const parts: Buffer[] = []
  for (const chunk of splitForGoogle(text)) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${tl}&client=tw-ob`
    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0",
      },
    })
    if (!resp.ok) throw new Error(`translate_tts http ${resp.status}`)
    parts.push(Buffer.from(await resp.arrayBuffer()))
  }
  return Buffer.concat(parts)
}

function audioResponse(mp3: Buffer): Response {
  return new Response(new Uint8Array(mp3), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": `public, max-age=${CACHE_MAX_AGE}`,
      "Content-Length": String(mp3.length),
    },
  })
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const text = (url.searchParams.get("text") ?? "").replace(/\s+/g, " ").trim()
  const voice = url.searchParams.get("voice") ?? DEFAULT_VOICE

  if (!text) {
    return new Response(JSON.stringify({ error: "text is required" }), { status: 400, headers: JSON_HEADERS })
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return new Response(JSON.stringify({ error: `text exceeds ${MAX_TEXT_LENGTH} characters` }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }
  if (!ALLOWED_VOICES.has(voice)) {
    return new Response(JSON.stringify({ error: "voice not allowed" }), { status: 400, headers: JSON_HEADERS })
  }

  const cacheKey = `${voice}\u0000${text}`
  const cached = cacheGet(cacheKey)
  if (cached) return audioResponse(cached)

  try {
    const { tts } = await loadEdgeTts()
    const mp3 = await withTimeout(tts(text, { voice }), EDGE_TTS_TIMEOUT_MS)
    cacheSet(cacheKey, mp3)
    return audioResponse(mp3)
  } catch (err) {
    // Токен edge-tts отозван / сеть блокирует wss — переходим на translate_tts
    if (typeof console !== "undefined") {
      console.warn("[tts] edge-tts failed, falling back to translate_tts:", err instanceof Error ? err.message : err)
    }
    try {
      const mp3 = await googleTts(text, voice)
      cacheSet(cacheKey, mp3)
      return audioResponse(mp3)
    } catch (err2) {
      if (typeof console !== "undefined") {
        console.error("[tts] all providers failed:", err2 instanceof Error ? err2.message : err2)
      }
      return new Response(JSON.stringify({ error: "tts unavailable" }), { status: 503, headers: JSON_HEADERS })
    }
  }
}
