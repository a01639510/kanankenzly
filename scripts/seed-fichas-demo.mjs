// Siembra el banco de preguntas Demo en el motor de fichas.
//
// Fuente: scripts/data/fichas-demo.json  (una ficha nucleo por PILARES, donde
// cada campo declara en config.esquemas a que normas sirve).
//
// Re-ejecutable: si la plantilla ya existe, borra sus secciones (cascade borra
// los campos) y las vuelve a crear. NO borra la fila de form_templates, para
// que las fichas ya capturadas conserven su template_id.
//
// Uso:
//   node scripts/seed-fichas-demo.mjs            -> SIMULACION (no escribe)
//   node scripts/seed-fichas-demo.mjs --commit   -> escribe en la base
//
// La organizacion se toma de ORG_SLUG en .env.local (por defecto 'demo').
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const COMMIT = process.argv.includes('--commit')

const env = readFileSync('.env.local', 'utf8')
const get = (k) => env.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim()
const admin = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
})

const ORG_SLUG = process.env.ORG_SLUG || get('ORG_SLUG') || 'demo'
const banco = JSON.parse(readFileSync('scripts/data/fichas-demo.json', 'utf8'))

const fallar = (msg) => {
  console.error(`\n  ERROR: ${msg}\n`)
  process.exit(1)
}

// --- organizacion ----------------------------------------------------------
const { data: org, error: eOrg } = await admin
  .from('organizaciones')
  .select('id, nombre')
  .eq('slug', ORG_SLUG)
  .single()

if (eOrg || !org) fallar(`No se encontro la organizacion con slug '${ORG_SLUG}'. Revisa ORG_SLUG en .env.local.`)

console.log(`\n  Organizacion : ${org.nombre}  (slug: ${ORG_SLUG})`)
console.log(`  Modo         : ${COMMIT ? 'COMMIT (escribe)' : 'SIMULACION (no escribe)'}\n`)

let totalSecciones = 0
let totalCampos = 0

for (const tpl of banco.templates) {
  const nCampos = tpl.secciones.reduce((a, s) => a + s.campos.length, 0)
  totalSecciones += tpl.secciones.length
  totalCampos += nCampos

  console.log(`  Plantilla: ${tpl.nombre}`)
  console.log(`    cultivo: ${tpl.tipo_cultivo} | secciones: ${tpl.secciones.length} | campos: ${nCampos}`)

  if (!COMMIT) {
    for (const s of tpl.secciones) console.log(`      ${String(s.orden).padStart(2)}. ${s.nombre}  (${s.campos.length} campos)`)
    continue
  }

  // Plantilla: reusar si existe, para no romper fichas ya capturadas.
  const { data: existente } = await admin
    .from('form_templates')
    .select('id')
    .eq('org_id', org.id)
    .eq('nombre', tpl.nombre)
    .maybeSingle()

  let templateId = existente?.id
  if (templateId) {
    const { error } = await admin.from('form_secciones').delete().eq('template_id', templateId)
    if (error) fallar(`No se pudieron borrar las secciones previas: ${error.message}`)
    console.log('    (plantilla existente: secciones reemplazadas)')
  } else {
    const { data, error } = await admin
      .from('form_templates')
      .insert({
        org_id: org.id,
        tipo_cultivo: tpl.tipo_cultivo,
        nombre: tpl.nombre,
        version: tpl.version ?? 1,
        activo: tpl.activo ?? true,
      })
      .select('id')
      .single()
    if (error) fallar(`No se pudo crear la plantilla: ${error.message}`)
    templateId = data.id
  }

  for (const sec of tpl.secciones) {
    const { data: secRow, error: eSec } = await admin
      .from('form_secciones')
      .insert({ template_id: templateId, nombre: sec.nombre, orden: sec.orden })
      .select('id')
      .single()
    if (eSec) fallar(`Seccion '${sec.nombre}': ${eSec.message}`)

    const filas = sec.campos.map((c) => ({
      seccion_id: secRow.id,
      nombre_interno: c.nombre_interno,
      etiqueta: c.etiqueta,
      tipo: c.tipo,
      opciones: c.opciones ?? null,
      requerido: c.requerido ?? false,
      orden: c.orden,
      config: c.config ?? {},
    }))

    const { error: eCampos } = await admin.from('form_campos').insert(filas)
    if (eCampos) fallar(`Campos de '${sec.nombre}': ${eCampos.message}`)

    console.log(`      ${String(sec.orden).padStart(2)}. ${sec.nombre}  (${filas.length} campos)`)
  }
}

console.log(
  `\n  ${COMMIT ? 'Sembrado' : 'Se sembraria'}: ${banco.templates.length} plantilla(s), ${totalSecciones} secciones, ${totalCampos} campos.`
)
if (!COMMIT) console.log('  Vuelve a correr con --commit para escribir en la base.\n')
else console.log('')
