// Verify the Epoch data frame: content/epochs/present-simple/index.json
// (4 sectors x 4 stations; registered station files are normalized through the
// canonical normalize.mjs when they exist — content files are added by later
// tickets, so missing files are reported but not fatal).
// Imports normalize from scripts/normalize.mjs (single source of truth ->
// frontend/src/lib/normalize.mjs).
import { readFileSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { normalize } from "./normalize.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const epochDir = join(__dirname, "../content/epochs/present-simple")
const indexPath = join(epochDir, "index.json")

let errors = 0
const fail = (msg) => {
  console.error("❌ " + msg)
  errors++
}

let index
try {
  index = JSON.parse(readFileSync(indexPath, "utf8"))
} catch (e) {
  fail(`Не удалось прочитать или распарсить ${indexPath}: ${e.message}`)
  process.exit(1)
}

// --- Эпоха ---------------------------------------------------------------
if (index.epoch !== "present-simple") {
  fail(`epoch !== "present-simple" (получено: ${JSON.stringify(index.epoch)})`)
}

// --- Секторы: ровно 4, id строго a1/a2/b1/b2 в этом порядке ---------------
const sectors = Array.isArray(index.sectors) ? index.sectors : []
const expectedIds = ["a1", "a2", "b1", "b2"]
const actualIds = sectors.map((s) => (s && typeof s === "object" ? s.id : undefined))
if (sectors.length !== 4) {
  fail(`Секторов: ${sectors.length}, ожидалось ровно 4`)
}
if (
  actualIds.length !== expectedIds.length ||
  !expectedIds.every((id, i) => actualIds[i] === id)
) {
  fail(`Состав/порядок id секторов неверен: ${JSON.stringify(actualIds)} (ожидалось: ${JSON.stringify(expectedIds)})`)
}

// --- Станции: ровно 4 в каждом секторе, непустые id/file/title ------------
const stations = []
for (const sector of sectors) {
  if (!sector || typeof sector !== "object") {
    fail("Сектор не является объектом")
    continue
  }
  const list = Array.isArray(sector.stations) ? sector.stations : []
  if (list.length < 4) {
    fail(`Сектор ${sector.id}: станций ${list.length}, ожидалось минимум 4`)
  }
  for (const st of list) {
    if (!st || typeof st !== "object") {
      fail(`Сектор ${sector.id}: станция не является объектом`)
      continue
    }
    if (!st.id || !st.file || !st.title) {
      fail(`Сектор ${sector.id}: у станции пустые id/file/title: ${JSON.stringify(st)}`)
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
    continue // контент добавляют T08–T11
  }
  filesOnDisk++
  let raw
  try {
    raw = JSON.parse(readFileSync(filePath, "utf8"))
  } catch (e) {
    fail(`Станция ${st.sector}/${st.file}: не читается/не парсится JSON: ${e.message}`)
    continue
  }
  const norm = normalize(raw)
  for (const field of ["id", "title", "type", "category"]) {
    if (!norm[field]) {
      fail(`Станция ${st.sector}/${st.file}: после normalize отсутствует поле "${field}"`)
    }
  }

  // --- Тип matching (T05, станция B1.2 «Анализ Профилей») ------------------
  // Контракт: matching.items[] непустой; text непустая строка; options >= 2
  // уникальных; answer обязан быть среди options.
  if (norm.type === "matching") {
    const data = norm.matching && typeof norm.matching === "object" ? norm.matching : null
    const items = data && Array.isArray(data.items) ? data.items : null
    if (!items || items.length === 0) {
      fail(`Станция ${st.sector}/${st.file}: matching.items — непустой массив обязателен`)
    } else {
      items.forEach((it, i) => {
        const where = `Станция ${st.sector}/${st.file}: matching.items[${i}]`
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
      fail(`Станция ${st.sector}/${st.file}: textFix.sentences — непустой массив обязателен`)
    } else {
      const tokenize = (text) => String(text).split(/\s+/).filter(Boolean)
      const normalizeWord = (word) => String(word).replace(/^[^\p{L}\p{N}'-]+|[^\p{L}\p{N}'-]+$/gu, "").toLowerCase()
      sentences.forEach((sent, si) => {
        const where = `Станция ${st.sector}/${st.file}: textFix.sentences[${si}]`
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
      fail(`Станция ${st.sector}/${st.file}: checklist разрешён только для типов voice-chat/role-play (получено: ${JSON.stringify(norm.type)})`)
    }
    const items = Array.isArray(norm.checklist) ? norm.checklist : null
    if (!items || items.length === 0) {
      fail(`Станция ${st.sector}/${st.file}: checklist — непустой массив обязателен`)
    } else {
      items.forEach((it, i) => {
        const where = `Станция ${st.sector}/${st.file}: checklist[${i}]`
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

// --- Сводка ----------------------------------------------------------------
const sectorCount = sectors.length
const stationCount = stations.length
console.log(`Секторов: ${sectorCount}, станций: ${stationCount}, файлов станций на месте: ${filesOnDisk}/${stationCount}`)
if (sectorCount !== 4 || stationCount < 16) {
  fail(`Ожидалось 4 сектора и минимум 16 станций (получено: ${sectorCount}/${stationCount})`)
}

if (errors > 0) {
  console.error(`❌ FAILED (${errors} ошибок)`)
  process.exit(1)
}
console.log("✅ ALL PASSED")
