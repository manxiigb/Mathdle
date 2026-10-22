import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// ---------- Argumentos ----------
const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const opt = (name, def) =>
  args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? def

const file = opt('file', 'data/problems.json')
const dryRun = flag('dry-run')
const force = flag('force')

// ---------- Fechas (hora de Chile) ----------
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

const start = opt('start', addDays(today, 1)) // por defecto, desde mañana
if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) {
  console.error('--start debe tener formato YYYY-MM-DD')
  process.exit(1)
}

// ---------- Leer y validar ----------
const raw = JSON.parse(readFileSync(file, 'utf8'))
if (!Array.isArray(raw) || raw.length === 0) {
  console.error(`${file} debe ser un arreglo con al menos un problema`)
  process.exit(1)
}

const errors = []
const items = raw.map((p, i) => {
  const n = i + 1
  const statement = String(p.statement ?? '').trim()
  let answer = String(p.answer ?? '').trim()
  const looksNumeric = answer !== '' && Number.isFinite(Number(answer.replace(',', '.')))
  const answer_type = p.answer_type ?? (looksNumeric ? 'number' : 'text')
  const hints = p.hints ?? []
  const max_attempts = p.max_attempts ?? 5

  if (!statement) errors.push(`#${n}: falta "statement"`)
  if (!answer) errors.push(`#${n}: falta "answer"`)
  if (!['number', 'text'].includes(answer_type)) errors.push(`#${n}: answer_type inválido`)
  if (answer_type === 'number') {
    answer = answer.replace(',', '.')
    if (!Number.isFinite(Number(answer))) errors.push(`#${n}: la respuesta no es un número`)
  }
  if (!Array.isArray(hints)) errors.push(`#${n}: "hints" debe ser un arreglo`)
  else if (hints.length > max_attempts - 1) {
    console.warn(`#${n}: tiene ${hints.length} pistas pero solo se verán ${max_attempts - 1}`)
  }

  return {
    n, statement, answer, answer_type, hints, max_attempts,
    title: p.title ?? null,
    tolerance: p.tolerance ?? 0,
    explanation: p.explanation ?? null,
    publish_date: addDays(start, i),
  }
})

if (errors.length) {
  console.error('Errores en los datos:\n' + errors.join('\n'))
  process.exit(1)
}

// No tocar el problema de hoy ni los pasados salvo con --force
const toWrite = items.filter((it) => force || it.publish_date > today)
const skipped = items.length - toWrite.length
if (skipped) {
  console.warn(`Se omiten ${skipped} problema(s) con fecha de hoy o pasada (usa --force para escribirlos)`)
}
if (toWrite.length === 0) {
  console.log('Nada que cargar.')
  process.exit(0)
}

console.table(
  toWrite.map((it) => ({
    n: it.n,
    fecha: it.publish_date,
    tipo: it.answer_type,
    respuesta: it.answer,
    enunciado: it.statement.slice(0, 50),
  }))
)

if (dryRun) {
  console.log('Dry run: no se escribió nada.')
  process.exit(0)
}

// ---------- Subir a Supabase ----------
const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY
if (!url || !key) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SECRET_KEY en .env.seed')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

try {
  const { data: rows, error } = await supabase
    .from('problems')
    .upsert(
      toWrite.map(({ publish_date, title, statement, answer_type, max_attempts }) => ({
        publish_date, title, statement, answer_type, max_attempts,
      })),
      { onConflict: 'publish_date' }
    )
    .select('id, publish_date')
  if (error) throw error

  const idByDate = new Map(rows.map((r) => [r.publish_date, r.id]))
  const secrets = toWrite.map((it) => ({
    problem_id: idByDate.get(it.publish_date),
    answer: it.answer,
    tolerance: it.tolerance,
    hints: it.hints,
    explanation: it.explanation,
  }))

  const { error: error2 } = await supabase
    .from('problem_secrets')
    .upsert(secrets, { onConflict: 'problem_id' })
  if (error2) throw error2

  console.log(`Listo: ${toWrite.length} problemas (${toWrite[0].publish_date} → ${toWrite.at(-1).publish_date})`)
} catch (e) {
  console.error('Error subiendo datos:', e.message ?? e)
  process.exit(1)
}