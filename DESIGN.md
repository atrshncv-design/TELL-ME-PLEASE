---
version: alpha
name: Tell Me Please — Bright Kids Palette
description: >-
  Яркая детская палитра платформы английского для 5–9 классов: сочный
  индиго-синий primary + 5 миров-акцентов (grammar, to-be, vocabulary,
  listening, speaking). Текст — тёмный на светлых поверхностях, WCAG AA ≥ 4.5:1.
colors:
  primary: "#4F46E5"
  primary-50: "#EEF2FF"
  primary-100: "#E0E7FF"
  primary-200: "#C7D2FE"
  primary-300: "#A5B4FC"
  primary-400: "#818CF8"
  primary-500: "#6366F1"
  primary-600: "#4F46E5"
  primary-700: "#4338CA"
  primary-800: "#3730A3"
  primary-900: "#312E81"
  grammar: "#6366F1"
  grammar-50: "#EEF2FF"
  grammar-100: "#E0E7FF"
  grammar-200: "#C7D2FE"
  grammar-300: "#A5B4FC"
  grammar-400: "#818CF8"
  grammar-500: "#6366F1"
  grammar-600: "#4F46E5"
  grammar-700: "#4338CA"
  grammar-800: "#3730A3"
  grammar-900: "#312E81"
  tobe: "#14B8A6"
  tobe-50: "#F0FDFA"
  tobe-100: "#CCFBF1"
  tobe-200: "#99F6E4"
  tobe-300: "#5EEAD4"
  tobe-400: "#2DD4BF"
  tobe-500: "#14B8A6"
  tobe-600: "#0D9488"
  tobe-700: "#0F766E"
  tobe-800: "#115E59"
  tobe-900: "#134E4A"
  vocabulary: "#10B981"
  vocabulary-50: "#ECFDF5"
  vocabulary-100: "#D1FAE5"
  vocabulary-200: "#A7F3D0"
  vocabulary-300: "#6EE7B7"
  vocabulary-400: "#34D399"
  vocabulary-500: "#10B981"
  vocabulary-600: "#059669"
  vocabulary-700: "#047857"
  vocabulary-800: "#065F46"
  vocabulary-900: "#064E3B"
  listening: "#F59E0B"
  listening-50: "#FFFBEB"
  listening-100: "#FEF3C7"
  listening-200: "#FDE68A"
  listening-300: "#FCD34D"
  listening-400: "#FBBF24"
  listening-500: "#F59E0B"
  listening-600: "#D97706"
  listening-700: "#B45309"
  listening-800: "#92400E"
  listening-900: "#78350F"
  speaking: "#F43F5E"
  speaking-50: "#FFF1F2"
  speaking-100: "#FFE4E6"
  speaking-200: "#FECDD3"
  speaking-300: "#FDA4AF"
  speaking-400: "#FB7185"
  speaking-500: "#F43F5E"
  speaking-600: "#E11D48"
  speaking-700: "#BE123C"
  speaking-800: "#9F1239"
  speaking-900: "#881337"
  background: "#F0F4FF"
  surface: "#FFFFFF"
  ink: "#1E293B"
  ink-soft: "#64748B"
typography:
  h1:
    fontFamily: Geist
    fontSize: 2.25rem
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  h2:
    fontFamily: Geist
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.25
  body-md:
    fontFamily: Geist
    fontSize: 1rem
    fontWeight: 500
    lineHeight: 1.6
  body-sm:
    fontFamily: Geist
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.lg}"
    padding: 16px
  button-primary-hover:
    backgroundColor: "{colors.primary-700}"
    textColor: "#FFFFFF"
    rounded: "{rounded.lg}"
  button-primary-active:
    backgroundColor: "{colors.primary-800}"
    textColor: "#FFFFFF"
    rounded: "{rounded.lg}"
  card-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: 16px
  card-world-grammar:
    backgroundColor: "{colors.grammar-50}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
  card-world-tobe:
    backgroundColor: "{colors.tobe-50}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
  card-world-vocabulary:
    backgroundColor: "{colors.vocabulary-50}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
  card-world-listening:
    backgroundColor: "{colors.listening-50}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
  card-world-speaking:
    backgroundColor: "{colors.speaking-50}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
  island-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.md}"
    padding: 12px
  island-dot-done:
    backgroundColor: "{colors.grammar-500}"
    rounded: "{rounded.xl}"
  badge-grammar:
    backgroundColor: "{colors.grammar-100}"
    textColor: "{colors.grammar-800}"
    rounded: "{rounded.sm}"
    padding: 8px
  badge-tobe:
    backgroundColor: "{colors.tobe-100}"
    textColor: "{colors.tobe-800}"
    rounded: "{rounded.sm}"
    padding: 8px
  badge-vocabulary:
    backgroundColor: "{colors.vocabulary-100}"
    textColor: "{colors.vocabulary-800}"
    rounded: "{rounded.sm}"
    padding: 8px
  badge-listening:
    backgroundColor: "{colors.listening-100}"
    textColor: "{colors.listening-800}"
    rounded: "{rounded.sm}"
    padding: 8px
  badge-speaking:
    backgroundColor: "{colors.speaking-100}"
    textColor: "{colors.speaking-800}"
    rounded: "{rounded.sm}"
    padding: 8px
  heading-primary:
    textColor: "{colors.primary-900}"
  heading-world:
    textColor: "{colors.grammar-700}"
  world-zone-grammar:
    backgroundColor: "{colors.grammar-100}"
    rounded: "{rounded.xl}"
  world-zone-tobe:
    backgroundColor: "{colors.tobe-100}"
    rounded: "{rounded.xl}"
  world-zone-vocabulary:
    backgroundColor: "{colors.vocabulary-100}"
    rounded: "{rounded.xl}"
  world-zone-listening:
    backgroundColor: "{colors.listening-100}"
    rounded: "{rounded.xl}"
  world-zone-speaking:
    backgroundColor: "{colors.speaking-100}"
    rounded: "{rounded.xl}"
  connector-done:
    backgroundColor: "{colors.grammar-400}"
---

# Tell Me Please — Bright Kids Palette

## Overview

TELL ME PLEASE — интерактивная платформа английского для детей 5–9 классов.
Дизайн-система построена вокруг **яркой, сочной, «мультяшной» палитры**:
один сильный основной цвет (индиго-синий) для действий и заголовков + пять
«миров»-акцентов, каждый из которых кодирует категорию заданий на карте миров:

| Мир (категория) | Акцент | Роль |
| --- | --- | --- |
| Grammar (грамматика) | индиго `#6366F1` | главный мир, совпадает с primary |
| To Be (глагол to be) | бирюза `#14B8A6` | отдельный мир-серия |
| Vocabulary (словарь) | изумруд `#10B981` | лексика |
| Listening (аудирование) | янтарь `#F59E0B` | звук и песни |
| Speaking (общение) | малина `#F43F5E` | голосовые задания |

Правило читаемости: **текст всегда тёмный на светлых поверхностях** (карточки,
зоны миров, бейджи) и белый на насыщенных кнопках. Контраст — WCAG AA (≥ 4.5:1)
для обычного текста. Фон приложения — мягкий светло-голубой `#F0F4FF`, чтобы
акценты «звенели», не утомляя глаза.

## Colors

- **Primary (`#4F46E5`)** — сочный индиго-синий. Кнопки, ссылки, заголовки,
  фокус-кольца. Сильный, но не кричащий; на нём белый текст читается с
  контрастом ~6.5:1.
- **Grammar (`#6366F1`)** — индиго-500. Мир «Грамматика» на карте миров.
  Преемственность с фазой 1 (грамматика всегда была индиго).
- **To Be (`#14B8A6`)** — бирюза. Мир «Глагол to be» (серия заданий 5 класса).
- **Vocabulary (`#10B981`)** — изумруд. Мир «Словарный запас».
- **Listening (`#F59E0B`)** — янтарь. Мир «Аудирование».
- **Speaking (`#F43F5E`)** — малина. Мир «Свободное общение».
- **Background (`#F0F4FF`)** — светло-голубой фон приложения.
- **Surface (`#FFFFFF`)** — белые карточки.
- **Ink (`#1E293B`)** — основной тёмный текст на светлом.
- **Ink-soft (`#64748B`)** — вторичный текст (описания, подписи).

Каждая семья акцентов имеет полную шкалу 50–900 (стандартные значения Tailwind)
— 50/100 для светлых зон и фонов, 300/400 для декоративных линий и
неактивных точек, 500 для активных маркеров, 600–900 для текста и hover.

## Typography

- **Geist** — единственный шрифт (переменная `--font-geist` в Next.js).
- **h1** — 2.25rem / 800 / -0.02em: заголовки страниц («Выбери свой класс»).
- **h2** — 1.5rem / 700: заголовки миров на карте.
- **body-md** — 1rem / 500: основной текст и подписи.
- **body-sm** — 0.875rem / 400: описания, счётчики, реплики Verb Bot.

## Layout & Spacing

- Базовая сетка — `sm: 8px`, `md: 16px`, `lg: 24px`, `xl: 32px`.
- Карта миров — вертикальная лента зон (по одной на категорию), внутри —
  «острова»-задания по 3 колонкам: карточка | точка-маршрут | карточка.
- Мобильный first: всё умещается на экране смартфона (вход через QR).

## Elevation & Depth

- Карточки — `shadow-md` в покое, `shadow-lg` + `scale-105` при hover
  (кнопки выбора класса), цветная тень тона акцента (`shadow-{accent}-100`).
- Точки маршрута на карте миров — цветные с белой обводкой и мягкой тенью;
  текущее задание обводится `ring-2` цвета мира.
- Кнопки — «пружинят» при нажатии (`active:scale-95`), как игрушечные.

## Shapes

- Кнопки и бейджи — `rounded-lg` (16px) / `rounded-sm` (8px), «подушечки».
- Карточки и зоны миров — `rounded-xl` (24px), крупные скругления для детского
  ощущения «наклейки».
- Точки маршрута — круги.

## Components

- **button-primary** — единственный высокоэмоциональный CTA (индиго, белый
  текст, 16px скругление). Hover — темнее (`primary-700`), active — ещё темнее
  (`primary-800`). Не более одного на экран.
- **card-surface** — белая карточка с тёмным текстом `ink`: контейнеры заданий,
  ссылки «Полезное».
- **card-world-*** — зона мира на карте: очень светлый фон тона акцента
  (50-100) + тёмный текст. Пять штук, никогда не путаются между собой.
- **island-card** — карточка задания: белая, скруглённая, с бейджем результата.
- **island-dot-done** — точка маршрута: заливается цветом мира, когда задание
  пройдено.
- **badge-*** — бейджи категорий: светлый фон (100) + тёмный текст (800)
  — контраст ~7:1 и выше. Используются в счётчиках и результатах.

## Do's and Don'ts

- **Do**: используй только палитру из этого файла; текст на светлых карточках
  — тёмный (ink / 700-900 оттенки); один CTA-цвет (primary) на экран.
- **Do**: подсвечивай прогресс цветом мира (точки, бейджи, счётчики).
- **Don't**: не ставь белый текст на светлые акценты (listening-400, speaking-300
  и т.п.) — контраст упадёт ниже AA.
- **Don't**: не вводи новые цвета вне палитры для интерфейсных элементов
  (эмодзи и фото-маскоты — исключение).
