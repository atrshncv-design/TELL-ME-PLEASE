"use client"

/**
 * /music (тикет W1-T01, Q8) — музыкальный портал: коллекция 12 эпох из всех
 * index.json content/epochs (поле music: {title, links[], sunoPrompt}).
 * Каждая эпоха: иконка + название, песни (ссылки) + Suno-промпт с кнопкой
 * «Скопировать промпт». «← Назад» → лендинг.
 */
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

/** Все 12 эпох (slug + иконка из index.json, порядок карты 12 эпох). */
const EPOCH_SLUGS = [
  "present-simple",
  "present-continuous",
  "past-simple",
  "past-continuous",
  "present-perfect",
  "present-perfect-continuous",
  "future-simple",
  "future-continuous",
  "past-perfect",
  "future-perfect",
  "past-perfect-continuous",
  "future-perfect-continuous",
]

interface EpochMusicData {
  epoch: string
  title: string
  icon?: string
  music?: { title: string; links: string[]; sunoPrompt: string; tracks?: { title: string; url: string }[]; linkTitles?: string[] }
}

export default function MusicPage() {
  const router = useRouter()
  const [epochs, setEpochs] = useState<EpochMusicData[]>([])
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all(
      EPOCH_SLUGS.map(async (slug) => {
        try {
          const res = await fetch(`/content/epochs/${slug}/index.json`)
          if (!res.ok) return null
          const j = (await res.json()) as EpochMusicData
          return j
        } catch {
          return null
        }
      })
    ).then((list) => {
      if (cancelled) return
      setEpochs(list.filter((e): e is EpochMusicData => Boolean(e)))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const copyPrompt = async (slug: string, prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopiedSlug(slug)
      setTimeout(() => setCopiedSlug(null), 2000)
    } catch {
      /* clipboard может быть недоступен — молча игнорируем */
    }
  }

  const withMusic = epochs.filter((e) => e.music && e.music.sunoPrompt)

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col gap-5 px-4 py-4">
      {/* ← Назад — на лендинг */}
      <button
        type="button"
        onClick={() => router.push("/")}
        aria-label="Назад на главную"
        className="flex min-h-[44px] min-w-[44px] items-center justify-center self-start rounded-2xl bg-primary-100 px-3 py-2 text-base font-bold text-primary-700 transition-colors hover:bg-primary-200"
      >
        ← Назад
      </button>

      <h1 className="font-display text-3xl font-black leading-tight tracking-tight text-primary-900">
        Музыкальный портал
      </h1>
      <p className="text-sm font-medium leading-snug text-slate-600">
        Спой песню по теме каждой эпохи как в караоке — или создай свой трек с
        помощью ИИ-генератора музыки (Suno AI) по готовому промпту!
      </p>

      {epochs.length === 0 && <p className="text-slate-500">Загрузка...</p>}

      <section className="flex flex-col gap-4">
        {withMusic.map((epoch, i) => (
          <motion.article
            key={epoch.epoch}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex flex-col gap-3 rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 shadow-soft"
          >
            <div className="flex items-center gap-3">
              {epoch.icon && (
                <span className="text-3xl" aria-hidden="true">
                  {epoch.icon}
                </span>
              )}
              <div>
                <h2 className="font-display text-lg font-extrabold leading-tight tracking-tight text-primary-900">
                  {epoch.title}
                </h2>
                <p className="text-sm font-semibold text-violet-700">{epoch.music?.title}</p>
              </div>
            </div>

            {((Array.isArray(epoch.music?.tracks) && epoch.music!.tracks!.length > 0) ||
              (Array.isArray(epoch.music?.links) && epoch.music!.links.length > 0)) && (
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(epoch.music?.tracks) && epoch.music!.tracks!.length > 0
                  ? epoch.music!.tracks!
                  : epoch.music!.links.map((link, i) => ({
                      title: epoch.music!.linkTitles?.[i] || "Слушать песни",
                      url: link,
                    }))
                ).map((track, li) =>
                  /^https?:\/\//i.test(track.url) ? (
                    <a
                      key={li}
                      href={track.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-[44px] items-center gap-1.5 rounded-full border-2 border-violet-200 bg-white px-4 py-2 text-sm font-bold text-violet-700 shadow-soft transition-colors hover:bg-violet-50"
                    >
                      🎵 {track.title}
                    </a>
                  ) : (
                    <span
                      key={li}
                      className="flex min-h-[44px] items-center rounded-full border-2 border-dashed border-violet-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-500"
                    >
                      🎵 {(track.title || track.url).replace(/^\[|\]$/g, "")}
                    </span>
                  )
                )}
              </div>
            )}

            <div className="rounded-2xl border border-violet-200 bg-white p-3">
              <p className="mb-1.5 text-xs font-black uppercase tracking-wide text-violet-600">
                Создай свой трек (Suno AI)
              </p>
              <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-slate-600">
                {epoch.music?.sunoPrompt}
              </p>
              <button
                type="button"
                onClick={() => copyPrompt(epoch.epoch, epoch.music?.sunoPrompt ?? "")}
                className={`mt-3 min-h-[44px] rounded-2xl border-2 px-4 py-2 text-sm font-bold transition-colors ${
                  copiedSlug === epoch.epoch
                    ? "border-success bg-success/10 text-success"
                    : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
                }`}
              >
                {copiedSlug === epoch.epoch ? "✓ Скопировано!" : "Скопировать промпт"}
              </button>
            </div>
          </motion.article>
        ))}
      </section>
    </div>
  )
}
