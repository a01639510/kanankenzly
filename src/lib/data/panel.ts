// Agregación server-side del Panel. Reúne en una sola pasada los KPIs de los
// módulos vivos: catálogos, cobertura geográfica (GeoSIC), tamizado EUDR,
// fichas de inspección y expediente técnico (bitácoras e historiales).
import { createClient } from '@/lib/supabase/server'
import { getParcelasGeo } from '@/lib/data/geosic'
import { calcularStats } from '@/lib/types'
import type { EstadoFicha } from '@/lib/types'
import type { ClasificacionEudr } from '@/lib/satelite/eudr'

// --- Tendencias del Panel: series reales (no simuladas) para los sparklines
// de las tarjetas KPI. Cada serie se arma agregando timestamps reales
// (created_at) de la propia tabla — nunca son datos inventados. Donde no
// existe un created_at útil (historial_manejo_anual) usamos la distribución
// real por año en su lugar.
export interface PanelTrends {
  productores: number[] // altas por semana, últimas 8 semanas
  parcelas: number[]
  hectareas: number[] // ha declaradas de las parcelas dadas de alta esa semana
  poligonos: number[] // polígonos activos subidos esa semana
  bitacoras: number[]
  historialesPorAnio: { anio: number; total: number }[]
  ndviPromedio: number[] // NDVI promedio semanal de todas las mediciones de la org
}

const SEMANAS = 8

// Devuelve el inicio (lunes 00:00 UTC) de la semana de una fecha.
function inicioSemana(d: Date): number {
  const x = new Date(d)
  const dow = x.getUTCDay() // 0=domingo
  const offset = dow === 0 ? 6 : dow - 1
  x.setUTCDate(x.getUTCDate() - offset)
  x.setUTCHours(0, 0, 0, 0)
  return x.getTime()
}

// Agrupa filas con `created_at` en las últimas `semanas` semanas, sumando
// `valor(fila)` en cada bucket (por defecto cuenta 1 por fila).
function bucketPorSemana<T extends { created_at: string }>(
  filas: T[],
  valor: (f: T) => number = () => 1,
  semanas = SEMANAS,
): number[] {
  const hoy = new Date()
  const claves: number[] = []
  for (let i = semanas - 1; i >= 0; i--) {
    const d = new Date(hoy)
    d.setUTCDate(d.getUTCDate() - i * 7)
    claves.push(inicioSemana(d))
  }
  const buckets = new Map(claves.map((k) => [k, 0]))
  const minClave = claves[0]
  for (const f of filas) {
    const t = inicioSemana(new Date(f.created_at))
    if (t < minClave || !buckets.has(t)) continue
    buckets.set(t, (buckets.get(t) ?? 0) + valor(f))
  }
  return claves.map((k) => buckets.get(k) ?? 0)
}

export interface PanelStats {
  // catálogos
  productores: number
  parcelas: number
  hectareas: number
  // cobertura geográfica
  con_poligono: number
  validadas: number
  diferencia_critica: number
  sin_poligono: number
  // tamizado EUDR (alerta temprana por NDVI)
  eudr_analizadas: number
  eudr_por_clasificacion: Record<ClasificacionEudr, number>
  // veredicto oficial de la verificadora
  eudr_verificadas: number
  eudr_deforestacion: number
  // traslape con la capa de bosque 2020 de la UE
  bosque2020_evaluadas: number
  bosque2020_con_traslape: number
  // fichas por estado
  fichas_total: number
  fichas_por_estado: Record<EstadoFicha, number>
  // expediente técnico
  bitacoras: number
  historiales: number
}

const ESTADOS: EstadoFicha[] = [
  'borrador', 'en_revision', 'aprobada', 'pdf_generado', 'requiere_correccion',
]

const CLASIFICACIONES: ClasificacionEudr[] = [
  'posible_perdida', 'vigilar', 'sin_cambio', 'sin_datos',
]

const num = (v: unknown) => Number(v) || 0

export async function getPanelStats(): Promise<PanelStats> {
  const supabase = await createClient()

  // Parcelas + geo (reutiliza el RPC del mapa) y la suma de hectáreas.
  const parcelasGeo = await getParcelasGeo()
  const geo = calcularStats(parcelasGeo)
  const hectareas = parcelasGeo.reduce((s, p) => s + num(p.superficie_declarada_ha), 0)

  const [productores, fichasEstados, bitacoras, historiales, eudr] = await Promise.all([
    supabase.from('productores').select('id', { count: 'exact', head: true }),
    supabase.from('fichas').select('estado'),
    supabase.from('bitacora_anual').select('id', { count: 'exact', head: true }),
    supabase.from('historial_manejo_anual').select('id', { count: 'exact', head: true }),
    supabase.from('parcela_eudr').select('clasificacion, estatus_oficial, bosque2020_pct'),
  ])

  // --- Fichas por estado ---
  const fichas_por_estado = Object.fromEntries(ESTADOS.map((e) => [e, 0])) as Record<EstadoFicha, number>
  for (const f of fichasEstados.data ?? []) {
    const e = f.estado as EstadoFicha
    if (e in fichas_por_estado) fichas_por_estado[e]++
  }

  // --- Tamizado EUDR + veredicto oficial + traslape con bosque 2020 ---
  const filas = eudr.data ?? []
  const eudr_por_clasificacion = Object.fromEntries(
    CLASIFICACIONES.map((c) => [c, 0]),
  ) as Record<ClasificacionEudr, number>

  let eudr_analizadas = 0
  let eudr_verificadas = 0
  let eudr_deforestacion = 0
  let bosque2020_evaluadas = 0
  let bosque2020_con_traslape = 0

  for (const r of filas) {
    const c = r.clasificacion as ClasificacionEudr | null
    if (c && c in eudr_por_clasificacion) {
      eudr_por_clasificacion[c]++
      if (c !== 'sin_datos') eudr_analizadas++
    }
    if (r.estatus_oficial === 'verificada') eudr_verificadas++
    if (r.estatus_oficial === 'deforestacion') eudr_deforestacion++
    if (r.bosque2020_pct != null) {
      bosque2020_evaluadas++
      if (num(r.bosque2020_pct) > 0) bosque2020_con_traslape++
    }
  }

  return {
    productores: productores.count ?? 0,
    parcelas: geo.total,
    hectareas,

    con_poligono: geo.con_poligono,
    validadas: geo.validadas,
    diferencia_critica: geo.diferencia_critica,
    sin_poligono: geo.sin_poligono,

    eudr_analizadas,
    eudr_por_clasificacion,
    eudr_verificadas,
    eudr_deforestacion,
    bosque2020_evaluadas,
    bosque2020_con_traslape,

    fichas_total: (fichasEstados.data ?? []).length,
    fichas_por_estado,

    bitacoras: bitacoras.count ?? 0,
    historiales: historiales.count ?? 0,
  }
}

// Series reales para los sparklines de las tarjetas KPI del Panel. Consulta
// aparte de getPanelStats() porque trae columnas distintas (created_at) que
// nadie más necesita.
export async function getPanelTrends(): Promise<PanelTrends> {
  const supabase = await createClient()

  const [productores, parcelas, poligonos, bitacoras, historiales, ndvi] =
    await Promise.all([
      supabase.from('productores').select('created_at'),
      supabase.from('parcelas').select('created_at, superficie_declarada_ha'),
      supabase.from('parcela_poligonos').select('created_at').eq('activo', true),
      supabase.from('bitacora_anual').select('created_at'),
      supabase.from('historial_manejo_anual').select('anio'),
      supabase.from('parcela_indices_satelitales').select('fecha_imagen, ndvi_promedio'),
    ])

  // --- Historial por año: distribución real (no hay created_at en esta tabla) ---
  const porAnio = new Map<number, number>()
  for (const r of historiales.data ?? []) {
    const a = r.anio as number
    porAnio.set(a, (porAnio.get(a) ?? 0) + 1)
  }
  const historialesPorAnio = Array.from(porAnio.entries())
    .sort((a, b) => a[0] - b[0])
    .slice(-6)
    .map(([anio, total]) => ({ anio, total }))

  // --- NDVI promedio semanal: bucket por semana de fecha_imagen, promedio ---
  const ndviFilas = (ndvi.data ?? [])
    .filter((r) => r.ndvi_promedio != null)
    .map((r) => ({ created_at: r.fecha_imagen as string, valor: num(r.ndvi_promedio) }))
  const ndviSuma = bucketPorSemana(ndviFilas, (f) => f.valor)
  const ndviCuenta = bucketPorSemana(ndviFilas)
  const ndviPromedio = ndviSuma.map((s, i) => (ndviCuenta[i] > 0 ? s / ndviCuenta[i] : 0))

  return {
    productores: bucketPorSemana(productores.data ?? []),
    parcelas: bucketPorSemana(parcelas.data ?? []),
    hectareas: bucketPorSemana(
      parcelas.data ?? [],
      (f) => num((f as { superficie_declarada_ha: number | null }).superficie_declarada_ha),
    ),
    poligonos: bucketPorSemana(poligonos.data ?? []),
    bitacoras: bucketPorSemana(bitacoras.data ?? []),
    historialesPorAnio,
    ndviPromedio,
  }
}
