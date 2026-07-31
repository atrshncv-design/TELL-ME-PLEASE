/**
 * POST /api/admin/auth — вход в скрытую админ-панель (T05).
 *
 * Сверяет логин/пароль с env-переменными (решение 14 из
 * docs/SPEC-spacezai-live-mvp.md). Пароль хранится только в .env,
 * никогда — в коде или БД.
 *
 * Переменные:
 *   ADMIN_LOGIN    — опционально, по умолчанию "admin".
 *   ADMIN_PASSWORD — обязателен. Если не задан, админка считается
 *                    выключенной и возвращается 500.
 *
 * Контракт:
 *   200 {"status":"ok"}                  — логин/пароль верные
 *   400 {"detail":"..."}                 — битое тело запроса
 *   401 {"detail":"..."}                 — неверные креды (сообщение
 *                                          намеренно одинаковое для
 *                                          логина и пароля, чтобы не
 *                                          подсказывать, что именно неверно)
 *   500 {"status":"error","detail":"..."} — ADMIN_PASSWORD не настроен
 *
 * MVP-упрощение (решено в T05): защиты /admin через middleware+cookie нет —
 * страница просто нигде не ссылается, а вход идёт через незаметную кнопку
 * и этот парольный роут. Для учительского MVP этого достаточно.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface AuthBody {
  login?: unknown
  password?: unknown
}

export async function POST(request: Request): Promise<Response> {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    // Явно сообщаем, что админка не настроена — иначе непонятно,
    // почему вход не работает даже с «верным» паролем.
    return Response.json(
      { status: "error", detail: "Админка не настроена" },
      { status: 500 },
    )
  }
  const adminLogin = process.env.ADMIN_LOGIN || "admin"

  let raw: AuthBody
  try {
    raw = (await request.json()) as AuthBody
  } catch {
    return Response.json({ detail: "Некорректный JSON" }, { status: 400 })
  }

  const login = typeof raw.login === "string" ? raw.login : ""
  const password = typeof raw.password === "string" ? raw.password : ""

  if (login !== adminLogin || password !== adminPassword) {
    return Response.json(
      { detail: "Неверный логин или пароль" },
      { status: 401 },
    )
  }

  return Response.json({ status: "ok" })
}
