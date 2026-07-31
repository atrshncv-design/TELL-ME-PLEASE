"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

/**
 * AdminLoginModal — всплывающее окно входа в админ-панель (T05).
 *
 * Открывается по клику на незаметную кнопку-шестерёнку на главной.
 * На submit — POST /api/admin/auth; при 200 — router.push("/admin"),
 * при 401 — подсветка ошибки «Неверный логин или пароль».
 *
 * Закрытие: клик по затемнённому фону, кнопка ✕ или Escape.
 */
interface AdminLoginModalProps {
  open: boolean
  onClose: () => void
}

export default function AdminLoginModal({ open, onClose }: AdminLoginModalProps) {
  const router = useRouter()
  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const reset = () => {
    setLogin("")
    setPassword("")
    setError(null)
    setPending(false)
  }

  const handleClose = () => {
    if (pending) return
    reset()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pending) return
    setPending(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      })
      if (res.ok) {
        // Успех — переходим на скрытую страницу. Модалку не закрываем
        // явно: она умрёт вместе с главной страницей после push.
        router.push("/admin")
        return
      }
      if (res.status === 401) {
        setError("Неверный логин или пароль")
      } else if (res.status === 500) {
        setError("Админка не настроена на сервере")
      } else {
        setError("Ошибка входа. Попробуйте ещё раз")
      }
    } catch {
      setError("Нет связи с сервером")
    } finally {
      setPending(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 px-4"
          onClick={handleClose}
          onKeyDown={(e) => {
            if (e.key === "Escape") handleClose()
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Вход в админ-панель"
        >
          <motion.form
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
            className="relative w-full max-w-sm rounded-2xl border border-primary-100 bg-white p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={handleClose}
              aria-label="Закрыть"
              className="absolute right-3 top-3 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>

            <h2 className="mb-1 text-xl font-bold text-primary-900">Вход для учителя</h2>
            <p className="mb-5 text-sm text-slate-500">Админ-панель со статистикой</p>

            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Логин</span>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                autoComplete="username"
                autoFocus
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </label>

            <label className="mb-4 block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Пароль</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </label>

            {error && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-gradient-to-r from-primary-500 to-violet-500 px-4 py-2.5 font-semibold text-white shadow-md shadow-primary-200 transition-all hover:from-primary-600 hover:to-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Проверяю…" : "Войти"}
            </button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
