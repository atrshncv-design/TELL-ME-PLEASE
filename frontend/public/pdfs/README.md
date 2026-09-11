# Таблицы времени для скачивания

Файлы `<slug>-bw-a5.pdf` (12 шт.: `present-simple-bw-a5.pdf`, `present-continuous-bw-a5.pdf`, `past-simple-bw-a5.pdf`, `past-continuous-bw-a5.pdf`, `present-perfect-bw-a5.pdf`, `present-perfect-continuous-bw-a5.pdf`, `past-perfect-bw-a5.pdf`, `past-perfect-continuous-bw-a5.pdf`, `future-simple-bw-a5.pdf`, `future-continuous-bw-a5.pdf`, `future-perfect-bw-a5.pdf`, `future-perfect-continuous-bw-a5.pdf`) — таблицы для запоминания правил каждого времени, формат Ч/Б · А5 (источник: `Исправленные таблицы 2/` в корне репозитория).

Блок «Материалы Эпохи для печати» на странице эпохи (`frontend/src/app/epoch/[slug]/page.tsx`) проверяет 4 варианта (Цвет/ЧБ × А4/А5); сейчас файл есть только у варианта Ч/Б · А5 — остальные кнопки показывают «Скоро» (disabled).

Каждый PDF ~2.3 MB, всего ~26 MB — следить за лимитом тарболла 50 MB: `public` копируется в `next-service-dist/public` целиком, `outputFileTracingExcludes` не трогает `public`.
