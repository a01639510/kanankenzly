'use client'

// Right-hand detail panel for a selected parcela. Shows declared vs measured
// area, the difference, the estado, and (for coordinators/admins) the
// approve / reject actions that hit the validation API route.
import { useState } from 'react'
import type { ParcelaGeoRow } from '@/lib/types'
import { ESTADO_COLOR } from '@/lib/types'
import EstadoBadge from './EstadoBadge'

interface Props {
  parcela: ParcelaGeoRow
  puedeValidar: boolean
  onClose: () => void
  onChanged: () => void
  shape?: string
}

export default function ParcelaPanel({
  parcela,
  puedeValidar,
  onClose,
  onChanged,
  shape,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tienePoligono = parcela.poligono_id !== null
  const estadoColor = ESTADO_COLOR[parcela.estado_validacion]

  async function validar(accion: 'aprobar' | 'rechazar') {
    if (!parcela.poligono_id) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/geosic/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poligono_id: parcela.poligono_id, accion }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Error ${res.status}`)
      }
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setBusy(false)
    }
  }

  const diferenciaPct = parcela.diferencia_pct ?? 0
  const diferenciaCritica = Math.abs(diferenciaPct) > 0.15

  return (
    <aside className="absolute inset-0 z-40 flex flex-col border-white/10 bg-surface md:static md:z-auto md:w-96 md:shrink-0 md:border-l">
      {/* Hero: preview de la forma del polígono a mayor escala. */}
      <div className="relative flex h-24 shrink-0 items-center justify-center overflow-hidden border-b border-white/10 bg-gradient-to-b from-[#1C1E24] to-[#16181D]">
        {shape ? (
          <svg viewBox="0 0 100 100" className="h-16 w-16" preserveAspectRatio="xMidYMid meet">
            <polygon points={shape} fill={`${estadoColor}26`} stroke={estadoColor} strokeWidth={3} strokeLinejoin="round" />
          </svg>
        ) : (
          <span className="font-mono text-[11px] text-silver">Sin polígono</span>
        )}
        <button
          onClick={onClose}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-silver backdrop-blur hover:text-white"
          aria-label="Cerrar"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: estadoColor }} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-medium text-white">
            {parcela.nombre || parcela.codigo_parcela}
          </h2>
          <p className="font-mono text-[11px] text-silver">{parcela.codigo_parcela}</p>
        </div>
        <EstadoBadge estado={parcela.estado_validacion} />
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <SubCard title="Identificación">
          <Field label="Productor" value={parcela.productor_nombre} />
          <Field label="Código productor" value={parcela.productor_codigo} />
          <Field
            label="Comunidad"
            value={parcela.comunidad || parcela.productor_comunidad || '—'}
          />
          <Field
            label="Municipio"
            value={parcela.municipio || parcela.productor_municipio || '—'}
          />
          <Field label="Cultivo" value={parcela.tipo_cultivo} />
        </SubCard>

        <SubCard title="Superficie">
          <Field
            label="Superficie declarada"
            value={fmtHa(parcela.superficie_declarada_ha)}
          />
          {tienePoligono ? (
            <>
              <Field label="Área medida" value={fmtHa(parcela.area_calc_ha)} />

              {/* Diferencia: la cifra que decide si el polígono se aprueba —
                  se destaca como stat, no como fila más. */}
              <div className="mt-2 flex items-center justify-between rounded-lg bg-black/30 px-2.5 py-2">
                <span className="font-mono text-[11px] tracking-wide text-silver">Diferencia</span>
                <span className={`text-base font-semibold ${diferenciaCritica ? 'text-red-400' : 'text-emerald-400'}`}>
                  {parcela.diferencia_ha !== null
                    ? `${(diferenciaPct * 100).toFixed(1)}%`
                    : '—'}
                </span>
              </div>

              <Field
                label="Perímetro"
                value={
                  parcela.perimetro_m !== null
                    ? `${parcela.perimetro_m.toFixed(0)} m`
                    : '—'
                }
              />
              <Field label="Levantamiento" value={parcela.fecha_levantamiento ?? '—'} />
            </>
          ) : (
            <p className="mt-2 rounded-lg bg-black/30 p-3 text-sm text-silver">
              Esta parcela aún no tiene polígono. Sube un KML/KMZ para
              georreferenciarla.
            </p>
          )}
        </SubCard>

        {error && (
          <p className="rounded-lg bg-red-500/10 p-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <a
          href={`/geosic/mapa/${parcela.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3 py-2 text-sm font-medium text-white transition hover:border-orange-500/40"
        >
          Mapa imprimible
        </a>
      </div>

      {puedeValidar && tienePoligono && parcela.estado_validacion !== 'validado' && (
        <div className="flex gap-2 border-t border-white/10 p-3">
          <button
            disabled={busy}
            onClick={() => validar('aprobar')}
            className="flex-1 rounded-full bg-emerald-500 px-3 py-2 text-sm font-medium text-black transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {busy ? '…' : 'Aprobar'}
          </button>
          <button
            disabled={busy}
            onClick={() => validar('rechazar')}
            className="flex-1 rounded-full border border-red-500/40 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
          >
            Rechazar
          </button>
        </div>
      )}

      {puedeValidar && parcela.estado_validacion === 'validado' && (
        <div className="border-t border-white/10 p-3">
          <button
            disabled={busy}
            onClick={() => validar('rechazar')}
            className="w-full rounded-full border border-white/10 px-3 py-2 text-sm font-medium text-silver transition hover:border-orange-500/40 hover:text-white disabled:opacity-50"
          >
            Revertir validación
          </button>
        </div>
      )}
    </aside>
  )
}

function SubCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-silver">{title}</p>
      {children}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-silver">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  )
}

function fmtHa(v: number | null): string {
  if (v === null || v === undefined) return '—'
  return `${v.toFixed(2)} ha`
}
