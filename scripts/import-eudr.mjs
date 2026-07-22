// Importa el VEREDICTO OFICIAL EUDR de la verificadora a parcela_eudr.
// Fuente: carpeta de resultados con un geojson por parcela, en dos subcarpetas
// que se ubican por nombre (se acepta cualquier prefijo/numeración):
//   .../<algo> Verified/<codigo>.geojson        -> verificada
//   .../<algo> Deforestacion/<codigo>.geojson   -> deforestacion
//
// Empareja por código base (MX003272-a -> parcela cuyo codigo_parcela empieza
// con MX003272). Requiere la migración 0030.
//
// Uso:
//   node scripts/import-eudr.mjs <ruta-carpeta> [--commit] [--fuente "..."] [--fecha AAAA-MM-DD]
//     sin --commit  -> SIMULACIÓN (solo reporta el emparejamiento)
//     con --commit  -> escribe en parcela_eudr
//
// La organización se toma de ORG_SLUG en .env.local (por defecto 'demo').
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'

const argv = process.argv.slice(2)
const COMMIT = argv.includes('--commit')
const flag = (nombre, porDefecto) => {
  const i = argv.indexOf(`--${nombre}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : porDefecto
}

const env = readFileSync('.env.local', 'utf8')
const get = (k) => env.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim()
const admin = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })

const ORG_SLUG = process.env.ORG_SLUG || get('ORG_SLUG') || 'demo'

// Primer posicional (ni bandera ni valor de bandera) = carpeta de resultados.
const CON_VALOR = new Set(['--fuente', '--fecha'])
const RAIZ = argv.filter((a, i) => !a.startsWith('--') && !CON_VALOR.has(argv[i - 1]))[0]
if (!RAIZ) {
  console.error('Falta la carpeta de resultados.')
  console.error('Uso: node scripts/import-eudr.mjs <ruta-carpeta> [--commit] [--fuente "..."] [--fecha AAAA-MM-DD]')
  process.exit(1)
}
const FUENTE = flag('fuente', 'Verificadora')
const FECHA = flag('fecha', new Date().toISOString().slice(0, 10))

// Subcarpetas (los nombres traen acentos combinados; los ubicamos por prefijo).
const subs = readdirSync(RAIZ, { withFileTypes: true }).filter((d) => d.isDirectory())
const dirVerif = subs.find((d) => /verified/i.test(d.name))?.name
const dirDefor = subs.find((d) => /deforesta/i.test(d.name))?.name

function codigos(dir) {
  if (!dir) return []
  return readdirSync(`${RAIZ}/${dir}`).filter((f) => f.toLowerCase().endsWith('.geojson')).map((f) => f.replace(/\.geojson$/i, ''))
}
const verif = codigos(dirVerif)
const defor = codigos(dirDefor)
console.log(`Verificadas: ${verif.length} | Deforestación: ${defor.length}`)

const { data: org } = await admin.from('organizaciones').select('id').eq('slug', ORG_SLUG).single()
const { data: parc } = await admin.from('parcelas').select('id, codigo_parcela')
// índice por código base (letras+dígitos iniciales, en mayúsculas)
const baseDe = (cod) => (String(cod).toUpperCase().match(/^[A-Z]+\d+/) || [''])[0]
const porBase = {}
for (const p of parc) (porBase[baseDe(p.codigo_parcela)] ??= []).push(p)

let ok = 0, noMatch = 0, ambig = 0
const filas = []
function procesar(lista, estatus) {
  for (const cod of lista) {
    const base = baseDe(cod)
    const cand = porBase[base] ?? []
    if (cand.length === 0) { noMatch++; if (estatus === 'deforestacion' || noMatch <= 8) console.log(`  ✗ ${cod} (${estatus}) -> sin parcela`); continue }
    // suffix a/b/c -> índice; si solo hay 1, esa
    const m = cod.toUpperCase().match(/-([A-Z])$/)
    let elegida = cand[0]
    if (cand.length > 1 && m) {
      const idx = m[1].charCodeAt(0) - 65
      elegida = cand[idx] ?? cand[0]
      if (!cand[idx]) ambig++
    }
    ok++
    filas.push({ parcela_id: elegida.id, org_id: org.id, estatus_oficial: estatus, fuente: FUENTE, fecha_oficial: FECHA })
  }
}
procesar(defor, 'deforestacion') // primero: tiene prioridad si hay choque
procesar(verif, 'verificada')

// Dedupe por parcela_id (una parcela puede tener varios geojson): conserva la
// primera vista, y deforestación gana sobre verificada.
const porParcela = new Map()
for (const f of filas) {
  const prev = porParcela.get(f.parcela_id)
  if (!prev || (f.estatus_oficial === 'deforestacion' && prev.estatus_oficial !== 'deforestacion')) {
    porParcela.set(f.parcela_id, f)
  }
}
const unicas = [...porParcela.values()]

console.log(`\nEmparejadas: ${ok} | sin parcela: ${noMatch} | únicas: ${unicas.length}`)
console.log('Deforestación:', unicas.filter((f) => f.estatus_oficial === 'deforestacion').length)

if (!COMMIT) { console.log('\n(SIMULACIÓN) corre con --commit para escribir en parcela_eudr.'); process.exit(0) }

let esc = 0
for (let i = 0; i < unicas.length; i += 200) {
  const lote = unicas.slice(i, i + 200)
  const { error } = await admin.from('parcela_eudr').upsert(lote, { onConflict: 'parcela_id' })
  if (error) { console.log('ERROR lote', i, error.message); break }
  esc += lote.length
}
console.log(`\nHecho. Escritas: ${esc}`)
