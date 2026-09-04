# Таблицы времени для скачивания

Файлы `present-simple.pdf`, `present-continuous.pdf`, `past-simple.pdf`, `past-continuous.pdf`, `present-perfect.pdf`, `present-perfect-continuous.pdf`, `past-perfect.pdf`, `past-perfect-continuous.pdf`, `future-simple.pdf`, `future-continuous.pdf`, `future-perfect.pdf`, `future-perfect-continuous.pdf` — таблицы для запоминания правил каждого времени (источник: `Таблицы для скачивания/` в корне репозитория).

Кнопка «Скачать таблицу времени» на странице эпохи (`frontend/src/app/epoch/[slug]/page.tsx`) ссылается на `/pdfs/<slug>.pdf`. Если файла нет — кнопка показывает «Скоро» (disabled).

Каждый PDF ~1.3 MB, всего ~16 MB — деплой `standalone` (лимит тарболла 50 MB) не ломается: `public` копируется в `next-service-dist/public` целиком, `outputFileTracingExcludes` не трогает `public`.
