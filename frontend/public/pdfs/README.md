# PDFs для печати — placeholder

Файлы `present-simple.pdf`, `present-continuous.pdf`, `past-simple.pdf`, `past-continuous.pdf`, `present-perfect.pdf`, `present-perfect-continuous.pdf`, `past-perfect.pdf`, `past-perfect-continuous.pdf`, `future-simple.pdf`, `future-continuous.pdf`, `future-perfect.pdf`, `future-perfect-continuous.pdf`, `exam.pdf` будут добавлены сюда.

Пока файлов нет — кнопка «Скачать PDF» на странице эпохи показывает «Скоро» (disabled).

Каждый PDF ожидается < 1 MB, всего < 13 MB — деплой `standalone` (лимит 50 MB) не ломается: `public` копируется в `next-service-dist/public` целиком, `outputFileTracingExcludes` не трогает `public`.
