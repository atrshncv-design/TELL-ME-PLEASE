/**
 * Шпаргалка «Правила: Present Simple» (тикет P6).
 *
 * Источник: `/tmp/new-materials/Чат-бот учитель (1).txt` — разделы 1–8 и 10:
 * когда используется, образование, -s/-es, отрицание, вопросы, Wh-questions,
 * глагол to be, слова-подсказки, короткая схема.
 *
 * Соглашение о разметке: строка, обёрнутая в *звёздочки*, — английский пример;
 * RulesPanel рендерит её курсивом. Обычные строки — объяснения на русском.
 */

export interface RuleSection {
  title: string
  /** Объяснения (русский) + примеры (*английский курсивом*). */
  items: string[]
}

export const presentSimpleRules: RuleSection[] = [
  {
    title: "1. Когда используется Present Simple",
    items: [
      "Привычки и повторяющиеся действия — то, что происходит регулярно: каждый день, часто, по выходным.",
      "*I go to school every day.*",
      "*She usually gets up at 7 o'clock.*",
      "Постоянные ситуации — где человек живёт, работает, что знает и любит.",
      "*He lives in London.*",
      "*My parents work in a hospital.*",
      "Общеизвестные факты — то, что верно всегда.",
      "*The Earth goes around the Sun.*",
      "*Water boils at 100 degrees.*",
      "Расписание: поезда, уроки, фильмы, концерты.",
      "*The train leaves at 8:15.*",
      "*The lesson starts at 9 a.m.*",
      "Статичные глаголы (состояние, а не действие): like, believe, understand…",
      "*I like chocolate.*",
      "*We understand the rule.*",
    ],
  },
  {
    title: "2. Как образуется Present Simple",
    items: [
      "С I / you / we / they — глагол в начальной форме (без окончаний).",
      "*I play.*  *They live.*  *We study.*",
      "С he / she / it — к глаголу добавляем -s или -es.",
      "*He plays.*  *She watches.*  *It goes.*",
    ],
  },
  {
    title: "3. Правило добавления -s / -es",
    items: [
      "Обычно просто добавляем -s.",
      "*play → plays*  *work → works*  *live → lives*",
      "Если глагол оканчивается на -s, -sh, -ch, -x, -o — добавляем -es.",
      "*watch → watches*  *pass → passes*  *go → goes*  *do → does*",
      "Согласная + y → меняем y на i и добавляем -es.",
      "*study → studies*  *try → tries*  *cry → cries*",
      "Гласная + y → просто добавляем -s.",
      "*play → plays*  *stay → stays*  *enjoy → enjoys*",
    ],
  },
  {
    title: "4. Отрицание",
    items: [
      "don’t — с I / you / we / they; doesn’t — с he / she / it.",
      "После don’t / doesn’t глагол всегда в начальной форме!",
      "*I don’t like tea.*",
      "*They don’t go to school on Sunday.*",
      "*She doesn’t work here.*",
      "Важно: после doesn’t у глагола НЕ может быть -s.",
      "Неправильно: *She doesn’t likes music.*",
      "Правильно: *She doesn’t like music.*",
    ],
  },
  {
    title: "5. Вопросы (общие)",
    items: [
      "Общий вопрос начинаем с Do или Does.",
      "*Do you like pizza?*",
      "*Do they play football?*",
      "*Does he work here?*",
      "После do / does глагол снова в начальной форме.",
      "Неправильно: *Does she likes music?*",
      "Правильно: *Does she like music?*",
    ],
  },
  {
    title: "6. Wh-questions",
    items: [
      "Если вопрос начинается с what, where, when, why, who, how — сначала Wh-слово, потом do / does, потом глагол.",
      "*What do you do?*",
      "*Where does he live?*",
      "*Why do they study English?*",
      "*How does she go to school?*",
    ],
  },
  {
    title: "7. Глагол to be в Present Simple",
    items: [
      "У глагола be свои формы: I am, he / she / it is, you / we / they are.",
      "*I am happy.*  *He is tired.*  *They are at school.*",
      "Отрицание: am not, is not / isn’t, are not / aren’t.",
      "*I am not happy.*  *He isn’t tired.*  *They aren’t at school.*",
      "Вопрос: Am / Is / Are в начале предложения.",
      "*Am I late?*  *Is he tired?*  *Are they at school?*",
      "С be НЕ нужны do / does!",
      "Неправильно: *Does he is tired?*",
      "Правильно: *Is he tired?*",
    ],
  },
  {
    title: "8. Слова-подсказки",
    items: [
      "Видишь эти слова — скорее всего, нужен Present Simple:",
      "always, usually, often, sometimes, never",
      "every day, every week, on Sundays",
      "in the morning, at 7 o’clock, once a year",
      "*She always drinks tea in the morning.*",
      "*We go to the park every Sunday.*",
    ],
  },
  {
    title: "10. Короткая схема",
    items: [
      "Утверждение: I / you / we / they + verb · he / she / it + verb-s / verb-es",
      "*I play.*  *He plays.*",
      "Отрицание: don’t + verb · doesn’t + verb",
      "*I don’t play.*  *She doesn’t play.*",
      "Вопрос: Do + подлежащее + verb? · Does + подлежащее + verb?",
      "*Do you play?*  *Does he play?*",
      "С be: am / is / are · am not / isn’t / aren’t · Am / Is / Are…?",
      "*They are at school.*  *Are they at school?*",
    ],
  },
]
