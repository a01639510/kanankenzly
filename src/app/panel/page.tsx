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
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-black">
      <AppHeader orgNombre={result.session.orgNombre} rol={result.session.rol} />
      <div className="min-h-0 flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <h1 className="text-xl font-normal text-cream">Panel de coordinación</h1>
            <p className="mt-1 text-sm text-gray-500">Resumen operativo de {result.session.orgNombre}</p>
          </div>

          {/* ALERTA EUDR — lo primero que debe ver el coordinador */}
          {enRiesgo > 0 && (
            <Link href="/satelite" className="block">
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 transition hover:border-red-500/40">
                <p className="text-sm font-medium text-red-400">
                  Parcelas con riesgo EUDR
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  {s.eudr_deforestacion > 0 && (
                    <b className="text-gray-300">
                      {s.eudr_deforestacion} con veredicto de deforestación
                    </b>
                  )}
                  {s.eudr_deforestacion > 0 && s.eudr_por_clasificacion.posible_perdida > 0 && ' · '}
                  {s.eudr_por_clasificacion.posible_perdida > 0 &&
                    `${s.eudr_por_clasificacion.posible_perdida} con posible pérdida de cobertura`}
                  . Revisar en Satélite →
                </p>
              </div>
            </Link>
          )}

          {/* Catálogos */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Kpi label="Productores" value={n(s.productores)} href="/productores" />
            <Kpi label="Parcelas" value={n(s.parcelas)} href="/productores" />
            <Kpi label="Hectáreas declaradas" value={`${n(s.hectareas, 1)} ha`} />
            <Kpi label="Con polígono" value={`${pctGeo}%`} href="/geosic" />
          </div>

          {/* Tamizado EUDR */}
          <Section title="Tamizado EUDR (alerta temprana por NDVI)" href="/satelite">
            {s.eudr_analizadas === 0 ? (
              <p className="text-sm text-gray-500">
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
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Mini label="Veredicto: verificadas" value={n(s.eudr_verificadas)} color="#4ade80" />
              <Mini label="Veredicto: deforestación" value={n(s.eudr_deforestacion)} color="#fb7185" />
              <Mini
                label="Traslape bosque 2020"
                value={`${n(s.bosque2020_con_traslape)} / ${n(s.bosque2020_evaluadas)}`}
                color="#fb923c"
              />
              <Mini label="Parcelas analizadas" value={n(s.eudr_analizadas)} color="#E5E2D2" />
            </div>
          </Section>

          {/* Cobertura geográfica */}
          <Section title="Cobertura geográfica (GeoSIC)" href="/geosic">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Mini label="Con polígono" value={`${s.con_poligono} · ${pctGeo}%`} color="#38bdf8" />
              <Mini label="Validadas" value={`${s.validadas} · ${pctVal}%`} color="#4ade80" />
              <Mini label="Diferencia crítica" value={s.diferencia_critica} color="#f87171" />
              <Mini label="Sin polígono" value={s.sin_poligono} color="#6b7280" />
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-orange-500" style={{ width: `${pctGeo}%` }} />
            </div>
          </Section>

          {/* Fichas por estado */}
          <Section title={`Fichas de inspección (${s.fichas_total})`} href="/fichas">
            <div className="flex flex-wrap gap-2">
              {estados.map((e) => (
                <span key={e} className={`rounded-full px-3 py-1 text-sm font-medium ${ESTADO_FICHA_BADGE[e]}`}>
                  {ESTADO_FICHA_LABEL[e]}: {s.fichas_por_estado[e]}
                </span>
              ))}
              {s.fichas_total === 0 && <span className="text-sm text-gray-500">Aún no hay fichas.</span>}
            </div>
          </Section>

          {/* Expediente técnico */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
            <Kpi label="Bitácoras" value={n(s.bitacoras)} href="/bitacora" />
            <Kpi label="Historiales" value={n(s.historiales)} href="/historial" />
          </div>
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const inner = (
    <div className="rounded-2xl border border-white/10 bg-surface p-4 transition hover:border-orange-500/40">
      <div className="font-mono text-[11px] tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-normal text-cream">{value}</div>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-mono text-[11px] uppercase tracking-wide text-gray-500">{title}</h2>
        <Link href={href} className="text-sm text-orange-400 hover:text-orange-300">
          Abrir →
        </Link>
      </div>
      {children}
    </section>
  )
}

function Mini({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div>
      <div className="font-mono text-[11px] tracking-wide text-gray-500">{label}</div>
      <div className="text-lg font-medium" style={{ color }}>
        {value}
      </div>
    </div>
  )
}
