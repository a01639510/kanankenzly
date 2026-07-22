// Agregación server-side del Panel. Reúne en una sola pasada los KPIs de los
// módulos vivos: catálogos, cobertura geográfica (GeoSIC), tamizado EUDR,
// fichas de inspección y expediente técnico (bitácoras e historiales).
import { createClient } from '@/lib/supabase/server'
import { getParcelasGeo } from '@/lib/data/geosic'
import { calcularStats } from '@/lib/types'
import type { EstadoFicha } from '@/lib/types'
import type { ClasificacionEudr } from '@/lib/satelite/eudr'

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
