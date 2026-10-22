import { readFileSync, writeFileSync } from 'node:fs'
import * as yaml from 'js-yaml'

// Por defecto lee el respaldo original y escribe el archivo final
const [inFile = 'data/problems.backup.yaml', outFile = 'data/problems.yaml'] = process.argv.slice(2)
const lines = readFileSync(inFile, 'utf8').split(/\r?\n/)

const TEXT_KEYS = new Set(['title', 'statement', 'answer', 'hint'])
const BLOCK = /^[|>][+-]?$/
const indentOf = (s) => s.match(/^\s*/)[0].length

// \\dots o \\\\dots (escapes mal puestos) -> \dots
const fixSlashes = (s) => s.replace(/\\{2,}(?=[A-Za-z])/g, '\\')

// ¿Esta línea termina con la comilla de cierre (no escapada)?
function closes(s, q) {
  const t = s.trimEnd()
  if (!t.endsWith(q)) return false
  let n = 0
  if (q === '"') {
    for (let k = t.length - 2; k >= 0 && t[k] === '\\'; k--) n++
    return n % 2 === 0
  }
  for (let k = t.length - 1; k >= 0 && t[k] === "'"; k--) n++
  return n % 2 === 1
}

// Lee un valor SIN interpretar escapes de YAML
function decode(raw) {
  let s = raw.trim()
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\{2,}/g, '\\')
  } else if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) {
    s = s.slice(1, -1).replace(/''/g, "'")
  }
  return fixSlashes(s).trim()
}

// Lee un valor que puede ocupar varias líneas. Devuelve el texto y la siguiente línea.
function readScalar(first, next, col) {
  const t = first.trim()
  const q = t[0]

  // Comillas que se cierran en una línea posterior
  if ((q === '"' || q === "'") && !(t.length >= 2 && (closes(t, q) || t === "''"))) {
    const parts = [t]
    const start = next
    for (;;) {
      if (next >= lines.length || next - start > 60) {
        throw new Error(`Línea ${start}: comilla ${q} sin cerrar (¿hay una comilla suelta dentro del texto?)`)
      }
      const l = lines[next].trim()
      parts.push(l)
      next++
      if (closes(l, q)) break
    }
    return { value: decode(parts.join('\n')), next }
  }

  // Texto plano que continúa en líneas más indentadas
  if (q !== '"' && q !== "'") {
    const parts = [t]
    while (next < lines.length && lines[next].trim() !== '' && indentOf(lines[next]) > col) {
      parts.push(lines[next].trim())
      next++
    }
    return { value: decode(parts.join('\n')), next }
  }

  return { value: decode(t), next }
}

const out = []
let converted = 0
let hintsDropped = 0

function emit(head, value, pad) {
  out.push(`${head}: |-`)
  for (const l of value.split('\n')) out.push(l ? pad + l : '')
}

let i = 0
while (i < lines.length) {
  const line = lines[i]
  const m = line.match(/^(\s*)(- )?([A-Za-z_]+):\s*(.*)$/)
  if (!m) { out.push(line); i++; continue }

  const [, ind, dash = '', key, rest] = m
  const col = ind.length + dash.length   // columna donde empieza la clave
  const pad = ' '.repeat(col + 2)

  // 1. Bloques | o > : se copian con sus líneas (arreglando dobles barras)
  if (BLOCK.test(rest)) {
    out.push(line)
    i++
    while (i < lines.length && (lines[i].trim() === '' || indentOf(lines[i]) > col)) {
      out.push(fixSlashes(lines[i]))
      i++
    }
    continue
  }

  // 2. hints: (lista) -> hint: (solo la primera)
  if (key === 'hints' && rest === '') {
    i++
    const items = []
    while (i < lines.length && /^\s+- /.test(lines[i]) && indentOf(lines[i]) >= col) {
      const { value, next } = readScalar(lines[i].replace(/^\s+- /, ''), i + 1, indentOf(lines[i]))
      items.push(value)
      i = next
    }
    if (items.length > 1) hintsDropped += items.length - 1
    if (items.length > 0) { emit(`${ind}hint`, items[0], pad); converted++ }
    continue
  }

  // 3. Textos (una o varias líneas) -> bloque seguro
  if (TEXT_KEYS.has(key) && rest !== '') {
    const { value, next } = readScalar(rest, i + 1, col)
    emit(`${ind}${dash}${key}`, value, pad)
    converted++
    i = next
    continue
  }

  // 4. Todo lo demás (answer_type, tolerance, max_attempts...) se deja igual
  out.push(line)
  i++
}

const result = out.join('\n')
writeFileSync(outFile, result)
console.log(`${converted} campos convertidos → ${outFile}`)
if (hintsDropped) console.warn(`Aviso: se descartaron ${hintsDropped} pistas extra (solo se usa una por problema)`)

// Validación: el resultado debe ser YAML válido y tener todos los problemas
try {
  const parsed = yaml.load(result)
  const expected = lines.filter((l) => /^- /.test(l)).length
  console.log(`YAML válido: ${parsed.length} problemas (el original tiene ${expected} líneas "- ")`)
  if (parsed.length !== expected) console.warn('¡Ojo! No coinciden las cantidades: revisa el archivo.')
} catch (e) {
  console.error('El resultado todavía no es YAML válido:\n' + e.message)
  process.exitCode = 1
}