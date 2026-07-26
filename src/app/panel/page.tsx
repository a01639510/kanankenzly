// Panel de coordinación (Server Component): KPIs de los módulos vivos, con el
// riesgo EUDR arriba porque es lo que decide si un lote puede exportarse.
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionResult } from '@/lib/session'
import { getPanelStats } from '@/lib/data/panel'
import AppHeader from '@/components/AppHeader'
import NoMembership from '@/components/geosic/NoMembership'
import { ESTADO_FICHA_LABEL, type EstadoFicha } from '@/lib/types'
import { ESTADO_FICHA_BADGE } from '@/lib/ficha-workflow'
import { EUDR_LABEL, EUDR_COLOR, type ClasificacionEudr } from '@/lib/satelite/eudr'

export const dynamic = 'force-dynamic'

const n = (v: number, d = 0) => v.toLocaleString('es-MX', { maximumFractionDigits: d })

const CLASIFICACIONES: ClasificacionEudr[] = [
  'posible_perdida', 'vigilar', 'sin_cambio', 'sin_datos',
]

// Color del dot de 6px que acompaña cada chip de estado (independiente de las
// clases de fondo/texto en ESTADO_FICHA_BADGE).
const ESTADO_FICHA_DOT: Record<EstadoFicha, string> = {
  borrador: 'bg-white/30',
  en_revision: 'bg-amber-400',
  aprobada: 'bg-emerald-400',
  pdf_generado: 'bg-sky-400',
  requiere_correccion: 'bg-red-400',
}

export default async function PanelPage() {
  const result = await getSessionResult()
  if (result.kind === 'no-auth') redirect('/login')
  if (result.kind === 'no-membership') return <NoMembership />

  const s = await getPanelStats()
  const pctGeo = s.parcelas > 0 ? Math.round((s.con_poligono / s.parcelas) * 100) : 0
  const pctVal = s.con_poligono > 0 ? Math.round((s.validadas / s.con_poligono) * 100) : 0
  const estados = Object.keys(ESTADO_FICHA_LABEL) as EstadoFicha[]

  // Lo que bloquea una exportación: veredicto oficial de deforestación o
  // parcelas que el tamizado propio marcó como posible pérdida de cobertura.
  const enRiesgo = s.eudr_deforestacion + s.eudr_por_clasificacion.posible_perdida

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
              <div className="relative overflow-hidden rounded-[20px] border border-red-500/20 bg-black/40 p-4 backdrop-blur-xl transition hover:border-red-500/40">
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

          {/* Catálogos — una sola fila bento con todo el conteo operativo. */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Kpi label="Productores" value={n(s.productores)} href="/productores" />
            <Kpi label="Parcelas" value={n(s.parcelas)} href="/productores" />
            <Kpi label="Hectáreas declaradas" value={`${n(s.hectareas, 1)} ha`} />
            <Kpi label="Con polígono" value={`${pctGeo}%`} href="/geosic" />
            <Kpi label="Bitácoras" value={n(s.bitacoras)} href="/bitacora" />
            <Kpi label="Historiales" value={n(s.historiales)} href="/historial" />
          </div>

          {/* Workspace: tamizado EUDR y cobertura geográfica lado a lado. */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Tamizado EUDR (alerta temprana por NDVI)" href="/satelite">
              {s.eudr_analizadas === 0 ? (
                <p className="text-sm text-silver">
                  Aún no se ha corrido el análisis EUDR. Ábrelo en Satélite para analizar las parcelas.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {CLASIFICACIONES.map((c) => (
                    <span
                      key={c}
                      className="rounded-full px-3 py-1 text-sm font-medium text-black"
                      style={{ backgroundColor: EUDR_COLOR[c] }}
                    >
                      {EUDR_LABEL[c]}: {s.eudr_por_clasificacion[c]}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4 grid grid-cols-2 gap-4">
                <Mini label="Veredicto: verificadas" value={n(s.eudr_verificadas)} color="#4ade80" />
                <Mini label="Veredicto: deforestación" value={n(s.eudr_deforestacion)} color="#fb7185" />
                <Mini
                  label="Traslape bosque 2020"
                  value={`${n(s.bosque2020_con_traslape)} / ${n(s.bosque2020_evaluadas)}`}
                  color="#fb923c"
                />
                <Mini label="Parcelas analizadas" value={n(s.eudr_analizadas)} color="#FFFFFF" />
              </div>
            </Section>

            <Section title="Cobertura geográfica (GeoSIC)" href="/geosic">
              <div className="grid grid-cols-2 gap-4">
                <Mini label="Con polígono" value={`${s.con_poligono} · ${pctGeo}%`} color="#38bdf8" />
                <Mini label="Validadas" value={`${s.validadas} · ${pctVal}%`} color="#4ade80" />
                <Mini label="Diferencia crítica" value={s.diferencia_critica} color="#f87171" />
                <Mini label="Sin polígono" value={s.sin_poligono} color="#8E939D" />
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-orange-500" style={{ width: `${pctGeo}%` }} />
              </div>
            </Section>
          </div>

          {/* Fichas por estado */}
          <Section title={`Fichas de inspección (${s.fichas_total})`} href="/fichas">
            <div className="flex flex-wrap gap-2">
              {estados.map((e) => (
                <span
                  key={e}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${ESTADO_FICHA_BADGE[e]}`}
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ESTADO_FICHA_DOT[e]}`} />
                  {ESTADO_FICHA_LABEL[e]}: {s.fichas_por_estado[e]}
                </span>
              ))}
              {s.fichas_total === 0 && <span className="text-sm text-silver">Aún no hay fichas.</span>}
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

// Card bento: gradiente descendente sutil + micro-borde rim-light + spotlight
// interno (glow radial arriba). El patrón se repite en Kpi y Section.
function Bento({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[20px] border border-white/10 bg-black/40 backdrop-blur-xl transition hover:border-orange-500/30 ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-14 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.06),_transparent_70%)]"
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

function Kpi({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const inner = (
    <Bento className="p-4">
      <div className="font-mono text-[11px] tracking-wide text-silver">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
    </Bento>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <Bento className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-mono text-[11px] uppercase tracking-wide text-silver">{title}</h2>
        <Link href={href} className="text-sm text-orange-400 hover:text-orange-300">
          Abrir →
        </Link>
      </div>
      {children}
    </Bento>
  )
}

function Mini({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div>
      <div className="font-mono text-[11px] tracking-wide text-silver">{label}</div>
      <div className="text-lg font-semibold" style={{ color }}>
        {value}
      </div>
    </div>
  )
}
