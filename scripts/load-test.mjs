#!/usr/bin/env node
/**
 * Нагрузочный тест голосового чата (тикет T10).
 *
 * Шлёт N параллельных POST на /api/chat/stream и проверяет:
 *  - сколько запросов стартовали сразу (слоты очереди);
 *  - сколько получили SSE-событие queued («Думаю над твоими словами…»);
 *  - сколько завершились done (успешный ответ);
 *  - сколько упали с error (перегрузка / лимиты / нет ключей);
 *  - время каждого запроса.
 *
 * Использование:
 *   node scripts/load-test.mjs http://localhost:3000 12
 *   (URL сервера + сколько параллельных запросов; дефолт: 10)
 *
 * Безопасно: не требует ключей, работает через публичный роут.
 */
const BASE = process.argv[2] || "http://localhost:3000";
const CONCURRENCY = parseInt(process.argv[3] || "10", 10);
const URL = `${BASE}/api/chat/stream`;

const BODY = {
  branch_id: "5",
  task_id: "voice_chat_greetings",
  task_context: "Задание: поздороваться и рассказать о себе (2-3 предложения).",
  messages: [{ role: "user", content: "Hello! My name is Tom." }],
};

/** Читает SSE-поток и возвращает список типов событий + полный ответ. */
async function sendOne(i) {
  const t0 = Date.now();
  const events = [];
  let fullContent = "";
  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(BODY),
    });
    if (!res.ok) {
      return { i, status: res.status, events, ms: Date.now() - t0, error: `HTTP ${res.status}` };
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        const chunk = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const dataLine = chunk
          .split("\n")
          .find((l) => l.startsWith("data:"));
        if (!dataLine) continue;
        try {
          const ev = JSON.parse(dataLine.slice(5).trim());
          events.push(ev.type);
          if (ev.content) fullContent += ev.content;
        } catch {
          /* не-JSON строка — игнор */
        }
      }
    }
    return { i, status: 200, events, ms: Date.now() - t0, len: fullContent.length };
  } catch (e) {
    return { i, status: 0, events, ms: Date.now() - t0, error: String(e.message || e) };
  }
}

const started = Date.now();
const results = await Promise.all(
  Array.from({ length: CONCURRENCY }, (_, i) => sendOne(i))
);
const totalMs = Date.now() - started;

const startedImmediately = results.filter((r) => !r.events.includes("queued") && r.status === 200).length;
const queued = results.filter((r) => r.events.includes("queued")).length;
const done = results.filter((r) => r.events.includes("done")).length;
const sessionEnded = results.filter((r) => r.events.includes("session_ended")).length;
const errors = results.filter((r) => r.events.includes("error") || r.status !== 200 || r.error);
const timeouts = results.filter((r) => r.ms >= 30000).length;

console.log("════════════ TELL ME PLEASE — нагрузочный тест ════════════");
console.log(`URL: ${URL}`);
console.log(`Параллельных запросов: ${CONCURRENCY}`);
console.log(`Общее время: ${(totalMs / 1000).toFixed(1)}с`);
console.log("───────────────────────────────────────────────────────────");
console.log(`✅ Стартовали сразу (заняли слоты):  ${startedImmediately}`);
console.log(`🕐 Встали в очередь (queued):        ${queued}`);
console.log(`✅ Получили ответ (done):            ${done}`);
console.log(`🏁 Финальный фидбек (session_ended): ${sessionEnded}`);
console.log(`❌ Ошибки:                          ${errors.length}`);
console.log(`⏱  Запросы дольше 30с:              ${timeouts}`);
console.log("───────────────────────────────────────────────────────────");
for (const r of results) {
  const tag = r.error ? `ERROR ${r.error}` : r.events.join(" → ");
  console.log(`  #${String(r.i).padStart(2, " ")}  ${String(r.ms).padStart(5)}мс  ${tag}`);
}
console.log("═══════════════════════════════════════════════════════════");
console.log(
  errors.length === 0 && done > 0
    ? "ВЫВОД: тест пройден ✅"
    : `ВЫВОД: есть проблемы (${errors.length} ошибок) — смотри выше`
);
