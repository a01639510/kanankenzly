// Panel de coordinación (Server Component): KPIs de los módulos vivos, con el
// riesgo EUDR arriba porque es lo que decide si un lote puede exportarse.
//
// Paleta reducida a propósito: naranja (marca/acción) + trío semántico
// esmeralda/ámbar/rojo (positivo/alerta/crítico) + blanco/plata (neutro).
// Nada de azul cielo, rosa o grises sueltos — cada color que aparece
// significa algo.
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionResult } from '@/lib/session'
import { getPanelStats, getPanelTrends } from '@/lib/data/panel'
import { getParcelaPolygons } from '@/lib/data/geosic'
import { buildShapes } from '@/lib/geo/shapes'
import AppHeader from '@/components/AppHeader'
import NoMembership from '@/components/geosic/NoMembership'
import CoberturaMiniMapa from '@/components/panel/CoberturaMiniMapa'
import { ESTADO_FICHA_LABEL, type EstadoFicha } from '@/lib/types'

export const dynamic = 'force-dynamic'

const n = (v: number, d = 0) => v.toLocaleString('es-MX', { maximumFractionDigits: d })

// Icono + color sólido para el segmento de cada estado de ficha en la barra
// (distinto del badge tenue que usa FichaEstadoControl en otras pantallas —
// aquí necesita ser sólido para leerse como segmento de barra).
const ESTADO_FICHA_SOLID: Record<EstadoFicha, string> = {
  borrador: '#8E939D',
  en_revision: '#fbbf24',
  aprobada: '#34d399',
  pdf_generado: '#38bdf8',
  requiere_correccion: '#f87171',
}

export default async function PanelPage() {
  const result = await getSessionResult()
  if (result.kind === 'no-auth') redirect('/login')
  if (result.kind === 'no-membership') return <NoMembership />

  const [s, trends, polygons] = await Promise.all([
    getPanelStats(),
    getPanelTrends(),
    getParcelaPolygons(),
  ])

  const pctGeo = s.parcelas > 0 ? Math.round((s.con_poligono / s.parcelas) * 100) : 0
  const estados = Object.keys(ESTADO_FICHA_LABEL) as EstadoFicha[]

  // Alertas: clasificaciones de vigilancia temprana (no es aún un veredicto
  // de deforestación, pero tampoco "sin cambio").
  const alertas = s.eudr_por_clasificacion.vigilar + s.eudr_por_clasificacion.posible_perdida
  const enRiesgo = s.eudr_deforestacion + s.eudr_por_clasificacion.posible_perdida

  // Mosaico decorativo del panel EUDR: hasta 8 formas reales de parcela de la
  // org (no son datos falsos — son las mismas geometrías de GeoSIC, solo de
  // fondo y muy tenues).
  const mosaico = Array.from(buildShapes(polygons).values()).slice(0, 8)

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <AppHeader orgNombre={result.session.orgNombre} rol={result.session.rol} />
      <div className="min-h-0 flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <h1 className="text-xl font-medium text-white">Panel de coordinación</h1>
            <p className="mt-1 text-sm text-silver">Resumen operativo de {result.session.orgNombre}</p>
          </div>

          {/* ALERTA EUDR — lo primero que debe ver el coordinador */}
          {enRiesgo > 0 && (
            <Link href="/satelite" className="block">
              <div className="relative overflow-hidden rounded-[20px] border border-red-500/20 bg-black/50 p-4 backdrop-blur-xl transition hover:border-red-500/40">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 z-0 h-16 bg-[radial-gradient(ellipse_at_top,_rgba(248,113,113,0.12),_transparent_70%)]"
                />
                <div className="relative z-10">
                  <p className="flex items-center gap-2 text-sm font-medium text-red-400">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                    Parcelas con riesgo EUDR
                  </p>
                  <p className="mt-1 text-sm text-silver">
                    {s.eudr_deforestacion > 0 && (
                      <b className="text-white">
                        {s.eudr_deforestacion} con veredicto de deforestación
                      </b>
                    )}
                    {s.eudr_deforestacion > 0 && s.eudr_por_clasificacion.posible_perdida > 0 && ' · '}
                    {s.eudr_por_clasificacion.posible_perdida > 0 &&
                      `${s.eudr_por_clasificacion.posible_perdida} con posible pérdida de cobertura`}
                    . Revisar en Satélite →
                  </p>
                </div>
              </div>
            </Link>
          )}

          {/* Catálogos — 6 tarjetas data-dense: ícono, cifra real, sparkline
              real (altas por semana, últimas 8 semanas). */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Kpi label="Productores" value={n(s.productores)} href="/productores" icon={<IconoTractor />} trend={trends.productores} />
            <Kpi label="Parcelas" value={n(s.parcelas)} href="/productores" icon={<IconoParcela />} trend={trends.parcelas} />
            <Kpi label="Hectáreas declaradas" value={n(s.hectareas, 1)} unidad="ha" icon={<IconoHoja />} trend={trends.hectareas} />
            <Kpi label="Con polígono" value={`${pctGeo}`} unidad="%" href="/geosic" icon={<IconoPoligono />} trend={trends.poligonos} />
            <Kpi label="Bitácoras" value={n(s.bitacoras)} href="/bitacora" icon={<IconoCuaderno />} trend={trends.bitacoras} />
            <Kpi label="Historiales" value={n(s.historiales)} href="/historial" icon={<IconoReloj />} trend={trends.historialesPorAnio.map((h) => h.total)} />
          </div>

          {/* Workspace: tamizado EUDR y cobertura geográfica lado a lado. */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Tamizado EUDR: mosaico real de formas de parcela de fondo +
                trío semántico (verificadas/alertas/deforestación) + NDVI. */}
            <Bento className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-mono text-[11px] uppercase tracking-wide text-silver">
                  Tamizado EUDR
                </h2>
                <Link href="/satelite" className="text-sm text-orange-400 hover:text-orange-300">
                  Abrir →
                </Link>
              </div>

              {/* Mosaico técnico: formas reales de parcela, muy tenues, de fondo. */}
              {mosaico.length > 0 && (
                <div className="pointer-events-none absolute inset-0 z-0 grid grid-cols-4 gap-2 p-5 opacity-[0.07]" aria-hidden="true">
                  {mosaico.map((pts, i) => (
                    <svg key={i} viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
                      <polygon points={pts} fill="none" stroke="#E1E0CC" strokeWidth={3} strokeLinejoin="round" />
                    </svg>
                  ))}
                </div>
              )}

              <div className="relative z-10">
                {s.eudr_analizadas === 0 ? (
                  <p className="text-sm text-silver">
                    Aún no se ha corrido el análisis EUDR. Ábrelo en Satélite para analizar las parcelas.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    <StatTrio label="Verificadas" value={n(s.eudr_verificadas)} color="#34d399" />
                    <StatTrio label="Alertas" value={n(alertas)} color="#fbbf24" />
                    <StatTrio label="Deforestación" value={n(s.eudr_deforestacion)} color="#f87171" />
                  </div>
                )}

                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="font-mono text-[11px] tracking-wide text-silver">
                    NDVI promedio · org · 8 semanas
                  </span>
                  <Sparkline data={trends.ndviPromedio} color="#34d399" width={80} height={22} />
                </div>
              </div>
            </Bento>

            {/* Cobertura geográfica: mini-mapa REAL con los polígonos de la
                organización, no un placeholder. */}
            <Bento className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-mono text-[11px] uppercase tracking-wide text-silver">
                  Cobertura geográfica
                </h2>
                <Link href="/geosic" className="text-sm text-orange-400 hover:text-orange-300">
                  Abrir →
                </Link>
              </div>

              <div className="h-36 overflow-hidden rounded-xl border border-white/10">
                {polygons.features.length > 0 ? (
                  <CoberturaMiniMapa polygons={polygons} />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-silver">
                    Sin polígonos todavía
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <div className="font-mono text-[11px] tracking-wide text-silver">Con polígono</div>
                  <div className="text-xl font-bold text-white">
                    {pctGeo}
                    <span className="text-sm font-normal text-silver"> % · {n(s.con_poligono)}/{n(s.parcelas)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[11px] tracking-wide text-silver">Diferencia crítica</div>
                  <div className={`text-xl font-bold ${s.diferencia_critica > 0 ? 'text-red-400' : 'text-white'}`}>
                    {n(s.diferencia_critica)}
                  </div>
                </div>
              </div>
            </Bento>
          </div>

          {/* Fichas por estado — barra segmentada + leyenda con ícono. */}
          <Bento className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-mono text-[11px] uppercase tracking-wide text-silver">
                Fichas de inspección ({n(s.fichas_total)})
              </h2>
              <Link href="/fichas" className="text-sm text-orange-400 hover:text-orange-300">
                Abrir →
              </Link>
            </div>

            {s.fichas_total === 0 ? (
              <p className="text-sm text-silver">Aún no hay fichas.</p>
            ) : (
              <>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-white/5">
                  {estados.map((e) => {
                    const pct = (s.fichas_por_estado[e] / s.fichas_total) * 100
                    if (pct === 0) return null
                    return (
                      <div
                        key={e}
                        style={{ width: `${pct}%`, backgroundColor: ESTADO_FICHA_SOLID[e] }}
                        title={`${ESTADO_FICHA_LABEL[e]}: ${s.fichas_por_estado[e]}`}
                      />
                    )
                  })}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {estados.map((e) => (
                    <div key={e} className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0" style={{ color: ESTADO_FICHA_SOLID[e] }}>
                        <IconoEstadoFicha estado={e} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-base font-bold text-white">{n(s.fichas_por_estado[e])}</div>
                        <div className="truncate font-mono text-[10px] tracking-wide text-silver">
                          {ESTADO_FICHA_LABEL[e]}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Bento>
        </div>
      </div>
    </div>
  )
}

// Card bento: cristal esmerilado opaco + micro-borde rim-light + spotlight
// interno. El patrón se repite en Kpi y las tarjetas del workspace.
function Bento({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[20px] border border-white/10 bg-black/50 backdrop-blur-xl transition hover:border-orange-500/30 ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-14 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.06),_transparent_70%)]"
      />
      {children}
    </div>
  )
}

function Kpi({
  label,
  value,
  unidad,
  href,
  icon,
  trend,
}: {
  label: string
  value: string | number
  unidad?: string
  href?: string
  icon: React.ReactNode
  trend: number[]
}) {
  const inner = (
    <Bento className="flex flex-col gap-3 p-4">
      <div className="relative z-10 flex items-start justify-between">
        <span className="text-silver">{icon}</span>
      </div>
      <div className="relative z-10">
        <div className="font-mono text-[11px] tracking-wide text-silver">{label}</div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-2xl font-bold text-white">{value}</span>
          {unidad && <span className="text-sm font-normal text-silver">{unidad}</span>}
        </div>
      </div>
      <div className="relative z-10 mt-auto">
        <Sparkline data={trend} />
      </div>
    </Bento>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

function StatTrio({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
      <div className="text-xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="mt-0.5 font-mono text-[10px] tracking-wide text-silver">{label}</div>
    </div>
  )
}

// Sparkline SVG: línea + área muy sutil. `data` son valores reales agregados
// server-side (ver src/lib/data/panel.ts) — nunca se generan aquí.
function Sparkline({
  data,
  color = '#8E939D',
  width = 100,
  height = 24,
}: {
  data: number[]
  color?: string
  width?: number
  height?: number
}) {
  if (!data || data.filter((v) => v > 0).length < 2) {
    return <div className="h-6 font-mono text-[10px] text-silver/50">sin histórico</div>
  }
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const step = data.length > 1 ? width / (data.length - 1) : width
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`)
  const area = `0,${height} ${pts.join(' ')} ${width},${height}`
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-6 w-full" preserveAspectRatio="none">
      <polyline points={area} fill={color} fillOpacity={0.12} stroke="none" />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// --- Iconos técnicos (line-art, monocromo — heredan color del texto) ---

function IconoTractor() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="17" r="3.2" />
      <circle cx="17.5" cy="17.5" r="2" />
      <path d="M4 17V8h5l1.5 4H15" />
      <path d="M11 8V5h3.5l1.5 3.5H19v6" />
    </svg>
  )
}

function IconoParcela() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9.5L11 4l9 5.5-2 10.5H6.5z" />
      <path d="M4 9.5l7 3.5 9-3.5" />
      <path d="M11 13v7" />
    </svg>
  )
}

function IconoHoja() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 20c0-9.5 6-15.5 15-16-1 9.5-7.5 15.5-15 16z" />
      <path d="M6 19c3-4 6.5-7.5 11-11" />
    </svg>
  )
}

function IconoPoligono() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9l8-5 8 5-2 10H6z" />
      <path d="M9 13.5l2 2 4-4.5" />
    </svg>
  )
}

function IconoCuaderno() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3v18" />
      <path d="M2.5 7.5h3M2.5 12h3M2.5 16.5h3" />
    </svg>
  )
}

function IconoReloj() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2" />
      <path d="M9 2.5L6 4.5M15 2.5l3 2" />
    </svg>
  )
}

function IconoEstadoFicha({ estado }: { estado: EstadoFicha }) {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (estado) {
    case 'borrador':
      return <svg {...common}><circle cx="12" cy="12" r="8" strokeDasharray="3 3.2" /></svg>
    case 'en_revision':
      return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 1.5" /></svg>
    case 'aprobada':
      return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M8.5 12.3l2.3 2.3 4.7-4.8" /></svg>
    case 'pdf_generado':
      return <svg {...common}><path d="M6 2.5h8l4 4v15H6z" /><path d="M14 2.5v4h4" /></svg>
    case 'requiere_correccion':
      return <svg {...common}><path d="M12 3.5l9.5 16.5H2.5z" /><path d="M12 10v4" /><path d="M12 17h.01" /></svg>
  }
}
