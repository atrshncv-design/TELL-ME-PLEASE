// Verify the Epoch data frames: content/epochs/*/index.json (ALL epochs).
// Each epoch: 4 sectors (a1/a2/b1/b2) x >=4 stations; theory/theoryQuiz/music
// validated when present; registered station files are normalized through the
// canonical normalize.mjs when they exist — content files are added by later
// tickets, so missing files are reported but not fatal.
// Imports normalize from scripts/normalize.mjs (single source of truth ->
// frontend/src/lib/normalize.mjs).
import { readFileSync, existsSync, readdirSync, statSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { normalize } from "./normalize.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const epochsRoot = join(__dirname, "../content/epochs")

let errors = 0
const fail = (msg) => {
  console.error("❌ " + msg)
  errors++
}

/** Валидация одного файла станции (JSON → normalize → обязательные поля →
 *  per-type валидаторы matching/text-fix/checklist). Предполагает, что файл
 *  СУЩЕСТВУЕТ (существование проверяет вызывающий). Вынесено из цикла эпох,
 *  чтобы тот же код работал для станций финального экзамена (T14). */
function validateStationFile(slug, dir, st) {
  const filePath = join(dir, st.file)
  let raw
  try {
    raw = JSON.parse(readFileSync(filePath, "utf8"))
  } catch (e) {
    fail(`${slug}: Станция ${st.sector}/${st.file}: не читается/не парсится JSON: ${e.message}`)
    return
  }
  const norm = normalize(raw)
  for (const field of ["id", "title", "type", "category"]) {
    if (!norm[field]) {
      fail(`${slug}: Станция ${st.sector}/${st.file}: после normalize отсутствует поле "${field}"`)
    }
  }

  // --- Тип matching (T05, станция B1.2 «Анализ Профилей») ------------------
  // Контракт: matching.items[] непустой; text непустая строка; options >= 2
  // уникальных; answer обязан быть среди options.
  if (norm.type === "matching") {
    const data = norm.matching && typeof norm.matching === "object" ? norm.matching : null
    const items = data && Array.isArray(data.items) ? data.items : null
    if (!items || items.length === 0) {
      fail(`${slug}: Станция ${st.sector}/${st.file}: matching.items — непустой массив обязателен`)
    } else {
      items.forEach((it, i) => {
        const where = `${slug}: Станция ${st.sector}/${st.file}: matching.items[${i}]`
        if (!it || typeof it.text !== "string" || it.text.trim() === "") {
          fail(`${where}.text — непустая строка обязательна`)
        }
        if (!Array.isArray(it.options) || it.options.length < 2) {
          fail(`${where}.options — минимум 2 варианта`)
        } else if (new Set(it.options).size !== it.options.length) {
          fail(`${where}.options — варианты не должны повторяться`)
        }
        if (typeof it.answer !== "string" || !Array.isArray(it.options) || !it.options.includes(it.answer)) {
          fail(`${where}.answer — обязан быть среди options`)
        }
      })
    }
  }

  // --- Тип text-fix (T06, станция B2.4 «Стабилизация Реальности») -----------
  // Контракт: textFix.sentences[] непустой; sentence непустая строка; errors
  // >= 1 на предложение; index — позиция слова-ошибки по split(/\s+/) (0-based)
  // и обязан указывать на существующий токен; wrong обязан совпадать с токеном
  // по index (регистронезависимо, пунктуация с краёв игнорируется); right
  // непустая строка; options (если есть) — непустой массив, содержащий right,
  // без дублей.
  if (norm.type === "text-fix") {
    const data = norm.textFix && typeof norm.textFix === "object" ? norm.textFix : null
    const sentences = data && Array.isArray(data.sentences) ? data.sentences : null
    if (!sentences || sentences.length === 0) {
      fail(`${slug}: Станция ${st.sector}/${st.file}: textFix.sentences — непустой массив обязателен`)
    } else {
      const tokenize = (text) => String(text).split(/\s+/).filter(Boolean)
      const normalizeWord = (word) => String(word).replace(/^[^\p{L}\p{N}'-]+|[^\p{L}\p{N}'-]+$/gu, "").toLowerCase()
      sentences.forEach((sent, si) => {
        const where = `${slug}: Станция ${st.sector}/${st.file}: textFix.sentences[${si}]`
        if (!sent || typeof sent.sentence !== "string" || sent.sentence.trim() === "") {
          fail(`${where}.sentence — непустая строка обязательна`)
          return
        }
        const tokens = tokenize(sent.sentence)
        const errs = Array.isArray(sent.errors) ? sent.errors : []
        if (errs.length === 0) {
          fail(`${where}.errors — минимум 1 ошибка на предложение`)
          return
        }
        errs.forEach((err, ei) => {
          const ewhere = `${where}.errors[${ei}]`
          if (!err || typeof err !== "object") {
            fail(`${ewhere} — объект {index, wrong, right} обязателен`)
            return
          }
          if (!Number.isInteger(err.index) || err.index < 0 || err.index >= tokens.length) {
            fail(`${ewhere}.index — должен указывать на токен предложения (0..${tokens.length - 1})`)
          }
          if (typeof err.wrong !== "string" || err.wrong.trim() === "") {
            fail(`${ewhere}.wrong — непустая строка обязательна`)
          } else if (Number.isInteger(err.index) && err.index >= 0 && err.index < tokens.length) {
            const token = tokens[err.index]
            if (normalizeWord(token) !== normalizeWord(err.wrong)) {
              fail(`${ewhere}.wrong — не совпадает с токеном по index (${JSON.stringify(token)} != ${JSON.stringify(err.wrong)})`)
            }
          }
          if (typeof err.right !== "string" || err.right.trim() === "") {
            fail(`${ewhere}.right — непустая строка обязательна`)
          }
          if (err.options !== undefined) {
            if (!Array.isArray(err.options) || err.options.length === 0 || !err.options.includes(err.right)) {
              fail(`${ewhere}.options — непустой массив, содержащий right`)
            } else if (new Set(err.options).size !== err.options.length) {
              fail(`${ewhere}.options — варианты не должны повторяться`)
            }
          }
        })
      })
    }
  }

  // --- Тип voice-chat/role-play с checklist (T07, станции Речи) ---------------
  // Контракт: checklist (если есть) — непустой массив {question, markers[],
  // min?, hint?}: question непустая строка; markers непустой string[] без
  // пустых строк; min (если указано) — целое >= 1.
  if (norm.checklist !== undefined) {
    if (norm.type !== "voice-chat" && norm.type !== "role-play") {
      fail(`${slug}: Станция ${st.sector}/${st.file}: checklist разрешён только для типов voice-chat/role-play (получено: ${JSON.stringify(norm.type)})`)
    }
    const items = Array.isArray(norm.checklist) ? norm.checklist : null
    if (!items || items.length === 0) {
      fail(`${slug}: Станция ${st.sector}/${st.file}: checklist — непустой массив обязателен`)
    } else {
      items.forEach((it, i) => {
        const where = `${slug}: Станция ${st.sector}/${st.file}: checklist[${i}]`
        if (!it || typeof it !== "object") {
          fail(`${where} — объект {question, markers, min?, hint?} обязателен`)
          return
        }
        if (typeof it.question !== "string" || it.question.trim() === "") {
          fail(`${where}.question — непустая строка обязательна`)
        }
        if (!Array.isArray(it.markers) || it.markers.length === 0) {
          fail(`${where}.markers — непустой string[] обязателен`)
        } else if (it.markers.some((m) => typeof m !== "string" || m.trim() === "")) {
          fail(`${where}.markers — все элементы должны быть непустыми строками`)
        }
        if (it.min !== undefined && (!Number.isInteger(it.min) || it.min < 1)) {
          fail(`${where}.min — целое число >= 1 (если указано)`)
        }
      })
    }
  }
}

/** Валидация index.json одной эпохи; возвращает {sectorCount, stationCount,
 *  filesOnDisk} для сводки. */
function verifyEpoch(epochDir) {
  const slug = epochDir.split("/").pop()
  const indexPath = join(epochDir, "index.json")

  let index
  try {
    index = JSON.parse(readFileSync(indexPath, "utf8"))
  } catch (e) {
    fail(`${slug}: Не удалось прочитать или распарсить index.json: ${e.message}`)
    return { sectorCount: 0, stationCount: 0, filesOnDisk: 0 }
  }

  // --- Эпоха ---------------------------------------------------------------
  if (index.epoch !== slug) {
    fail(`${slug}: epoch !== "${slug}" (получено: ${JSON.stringify(index.epoch)})`)
  }
  if (typeof index.title !== "string" || index.title.trim() === "") {
    fail(`${slug}: title — непустая строка обязательна`)
  }

  // --- theory (W1-T01): массив шагов {title, text} --------------------------
  if (index.theory !== undefined) {
    if (!Array.isArray(index.theory) || index.theory.length === 0) {
      fail(`${slug}: theory — непустой массив обязателен (если поле есть)`)
    } else {
      index.theory.forEach((t, i) => {
        const where = `${slug}: theory[${i}]`
        if (!t || typeof t !== "object") {
          fail(`${where} — объект {title, text} обязателен`)
          return
        }
        if (typeof t.title !== "string" || t.title.trim() === "") {
          fail(`${where}.title — непустая строка обязательна`)
        }
        if (typeof t.text !== "string" || t.text.trim() === "") {
          fail(`${where}.text — непустая строка обязательна`)
        }
      })
    }
  }

  // --- theoryQuiz (W1-T01): мини-тест {question, options[], answer} ---------
  if (index.theoryQuiz !== undefined) {
    if (!Array.isArray(index.theoryQuiz) || index.theoryQuiz.length === 0) {
      fail(`${slug}: theoryQuiz — непустой массив обязателен (если поле есть)`)
    } else {
      index.theoryQuiz.forEach((q, i) => {
        const where = `${slug}: theoryQuiz[${i}]`
        if (!q || typeof q !== "object") {
          fail(`${where} — объект {question, options[], answer} обязателен`)
          return
        }
        if (typeof q.question !== "string" || q.question.trim() === "") {
          fail(`${where}.question — непустая строка обязательна`)
        }
        if (!Array.isArray(q.options) || q.options.length < 2) {
          fail(`${where}.options — минимум 2 варианта`)
        } else if (new Set(q.options).size !== q.options.length) {
          fail(`${where}.options — варианты не должны повторяться`)
        }
        if (typeof q.answer !== "string" || !Array.isArray(q.options) || !q.options.includes(q.answer)) {
          fail(`${where}.answer — обязан быть среди options`)
        }
      })
    }
  }

  // --- music (W1-T01): {title, links[], sunoPrompt} -------------------------
  if (index.music !== undefined) {
    const m = index.music
    if (!m || typeof m !== "object") {
      fail(`${slug}: music — объект {title, links[], sunoPrompt} обязателен`)
    } else {
      if (typeof m.title !== "string" || m.title.trim() === "") {
        fail(`${slug}: music.title — непустая строка обязательна`)
      }
      if (!Array.isArray(m.links) || m.links.length === 0) {
        fail(`${slug}: music.links — непустой массив обязателен`)
      } else if (m.links.some((l) => typeof l !== "string" || l.trim() === "")) {
        fail(`${slug}: music.links — все элементы должны быть непустыми строками`)
      }
      if (typeof m.sunoPrompt !== "string" || m.sunoPrompt.trim() === "") {
        fail(`${slug}: music.sunoPrompt — непустая строка обязательна`)
      }
    }
  }

  // --- Секторы: ровно 4, id строго a1/a2/b1/b2 в этом порядке ---------------
  const sectors = Array.isArray(index.sectors) ? index.sectors : []
  const expectedIds = ["a1", "a2", "b1", "b2"]
  const actualIds = sectors.map((s) => (s && typeof s === "object" ? s.id : undefined))
  if (sectors.length !== 4) {
    fail(`${slug}: Секторов: ${sectors.length}, ожидалось ровно 4`)
  }
  if (
    actualIds.length !== expectedIds.length ||
    !expectedIds.every((id, i) => actualIds[i] === id)
  ) {
    fail(`${slug}: Состав/порядок id секторов неверен: ${JSON.stringify(actualIds)} (ожидалось: ${JSON.stringify(expectedIds)})`)
  }

  // --- Станции: минимум 4 в каждом секторе, непустые id/file/title ----------
  const stations = []
  for (const sector of sectors) {
    if (!sector || typeof sector !== "object") {
      fail(`${slug}: Сектор не является объектом`)
      continue
    }
    if (typeof sector.title !== "string" || sector.title.trim() === "") {
      fail(`${slug}: Сектор ${sector.id}: title — непустая строка обязательна`)
    }
    const list = Array.isArray(sector.stations) ? sector.stations : []
    if (list.length < 4) {
      fail(`${slug}: Сектор ${sector.id}: станций ${list.length}, ожидалось минимум 4`)
    }
    for (const st of list) {
      if (!st || typeof st !== "object") {
        fail(`${slug}: Сектор ${sector.id}: станция не является объектом`)
        continue
      }
      if (!st.id || !st.file || !st.title) {
        fail(`${slug}: Сектор ${sector.id}: у станции пустые id/file/title: ${JSON.stringify(st)}`)
        continue
      }
      stations.push({ sector: sector.id, id: st.id, file: st.file, title: st.title })
    }
  }

  // --- Файлы станций: если существуют — прогнать через normalize -----------
  let filesOnDisk = 0
  for (const st of stations) {
    const filePath = join(epochDir, st.file)
    if (!existsSync(filePath)) {
      continue // контент добавляют контентные тикеты (W3–W6)
    }
    filesOnDisk++
    validateStationFile(slug, epochDir, st)
  }

  const sectorCount = sectors.length
  const stationCount = stations.length
  if (sectorCount !== 4 || stationCount < 16) {
    fail(`${slug}: Ожидалось 4 сектора и минимум 16 станций (получено: ${sectorCount}/${stationCount})`)
  }
  return { sectorCount, stationCount, filesOnDisk }
}

/** Валидация финального экзамена content/exam/ (тикет T14 «Великий Экзамен
 *  Времен»). Отличается от эпохи: поле exam (не epoch), intro (панель +
 *  принцип + мини-тест), секторы sector-1..4, станций в doc: 4+4+4+6=18
 *  (тикет писал «24», в документе их 18 — валидируем по факту файлов). */
function verifyExam(examDir) {
  const slug = "exam"
  const indexPath = join(examDir, "index.json")

  let index
  try {
    index = JSON.parse(readFileSync(indexPath, "utf8"))
  } catch (e) {
    fail(`${slug}: Не удалось прочитать или распарсить index.json: ${e.message}`)
    return { sectorCount: 0, stationCount: 0, filesOnDisk: 0 }
  }

  if (index.exam !== "grand-tenses") {
    fail(`${slug}: exam !== "grand-tenses" (получено: ${JSON.stringify(index.exam)})`)
  }
  if (typeof index.title !== "string" || index.title.trim() === "") {
    fail(`${slug}: title — непустая строка обязательна`)
  }

  // --- intro (T14): {panel[3], principle[3], miniTest[6]} --------------------
  const intro = index.intro && typeof index.intro === "object" ? index.intro : null
  if (!intro) {
    fail(`${slug}: intro — объект {panel, principle, miniTest} обязателен`)
  } else {
    const panel = Array.isArray(intro.panel) ? intro.panel : []
    if (panel.length !== 3) {
      fail(`${slug}: intro.panel — ровно 3 блока панели времён (получено: ${panel.length})`)
    } else {
      panel.forEach((p, i) => {
        const where = `${slug}: intro.panel[${i}]`
        if (!p || typeof p.title !== "string" || p.title.trim() === "") {
          fail(`${where}.title — непустая строка обязательна`)
        }
        if (!p || typeof p.text !== "string" || p.text.trim() === "") {
          fail(`${where}.text — непустая строка обязательна`)
        }
      })
    }
    const principle = Array.isArray(intro.principle) ? intro.principle : []
    if (principle.length !== 3) {
      fail(`${slug}: intro.principle — ровно 3 вопроса главного принципа (получено: ${principle.length})`)
    } else if (principle.some((p) => typeof p !== "string" || p.trim() === "")) {
      fail(`${slug}: intro.principle — все элементы должны быть непустыми строками`)
    }
    const miniTest = Array.isArray(intro.miniTest) ? intro.miniTest : []
    if (miniTest.length !== 6) {
      fail(`${slug}: intro.miniTest — ровно 6 вопросов (получено: ${miniTest.length})`)
    } else {
      miniTest.forEach((q, i) => {
        const where = `${slug}: intro.miniTest[${i}]`
        if (!q || typeof q.sentence !== "string" || q.sentence.trim() === "") {
          fail(`${where}.sentence — непустая строка обязательна`)
        }
        if (!q || typeof q.answer !== "string" || q.answer.trim() === "") {
          fail(`${where}.answer — непустая строка обязательна`)
        }
      })
    }
  }

  // --- Секторы: ровно 4, id строго sector-1..4 в этом порядке -----------------
  const sectors = Array.isArray(index.sectors) ? index.sectors : []
  const expectedIds = ["sector-1", "sector-2", "sector-3", "sector-4"]
  const actualIds = sectors.map((s) => (s && typeof s === "object" ? s.id : undefined))
  if (sectors.length !== 4) {
    fail(`${slug}: Секторов: ${sectors.length}, ожидалось ровно 4`)
  }
  if (
    actualIds.length !== expectedIds.length ||
    !expectedIds.every((id, i) => actualIds[i] === id)
  ) {
    fail(`${slug}: Состав/порядок id секторов неверен: ${JSON.stringify(actualIds)} (ожидалось: ${JSON.stringify(expectedIds)})`)
  }

  // --- Станции: непустые id/file/title; файлы ОБЯЗАНЫ существовать (в отличие
  //     от эпох, где контент добавляют позже) и проходят validateStationFile ---
  const stations = []
  for (const sector of sectors) {
    if (!sector || typeof sector !== "object") {
      fail(`${slug}: Сектор не является объектом`)
      continue
    }
    if (typeof sector.title !== "string" || sector.title.trim() === "") {
      fail(`${slug}: Сектор ${sector.id}: title — непустая строка обязательна`)
    }
    const list = Array.isArray(sector.stations) ? sector.stations : []
    if (list.length < 4) {
      fail(`${slug}: Сектор ${sector.id}: станций ${list.length}, ожидалось минимум 4`)
    }
    for (const st of list) {
      if (!st || typeof st !== "object") {
        fail(`${slug}: Сектор ${sector.id}: станция не является объектом`)
        continue
      }
      if (!st.id || !st.file || !st.title) {
        fail(`${slug}: Сектор ${sector.id}: у станции пустые id/file/title: ${JSON.stringify(st)}`)
        continue
      }
      stations.push({ sector: sector.id, id: st.id, file: st.file, title: st.title })
    }
  }

  let filesOnDisk = 0
  for (const st of stations) {
    const filePath = join(examDir, st.file)
    if (!existsSync(filePath)) {
      fail(`${slug}: Станция ${st.sector}/${st.file}: файл не найден (в экзамене все станции обязаны быть на месте)`)
      continue
    }
    filesOnDisk++
    validateStationFile(slug, examDir, st)
  }

  const sectorCount = sectors.length
  const stationCount = stations.length
  if (sectorCount !== 4 || stationCount < 16) {
    fail(`${slug}: Ожидалось 4 сектора и минимум 16 станций (получено: ${sectorCount}/${stationCount})`)
  }
  return { sectorCount, stationCount, filesOnDisk }
}

// --- Цикл по всем эпохам -----------------------------------------------------
let epochDirs = []
try {
  epochDirs = readdirSync(epochsRoot)
    .filter((name) => statSync(join(epochsRoot, name)).isDirectory())
    .sort()
} catch (e) {
  fail(`Не удалось прочитать ${epochsRoot}: ${e.message}`)
  process.exit(1)
}

if (epochDirs.length === 0) {
  fail(`В ${epochsRoot} нет ни одной эпохи`)
  process.exit(1)
}

const summary = []
for (const slug of epochDirs) {
  const { sectorCount, stationCount, filesOnDisk } = verifyEpoch(join(epochsRoot, slug))
  summary.push({ slug, sectorCount, stationCount, filesOnDisk })
}

// --- Финальный экзамен (T14): content/exam/ ---------------------------------
const examRoot = join(__dirname, "../content/exam")
if (!existsSync(examRoot)) {
  fail(`Не найден каталог финального экзамена ${examRoot}`)
} else {
  const { sectorCount, stationCount, filesOnDisk } = verifyExam(examRoot)
  summary.push({ slug: "exam", sectorCount, stationCount, filesOnDisk })
}

// --- Сводка по всем эпохам ---------------------------------------------------
console.log("Эпох: " + summary.length)
for (const s of summary) {
  console.log(`  ${s.slug}: секторов ${s.sectorCount}, станций ${s.stationCount}, файлов станций на месте: ${s.filesOnDisk}/${s.stationCount}`)
}

if (errors > 0) {
  console.error(`❌ FAILED (${errors} ошибок)`)
  process.exit(1)
}
console.log("✅ ALL PASSED")
