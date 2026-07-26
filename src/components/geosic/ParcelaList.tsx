// Lista de micro-tarjetas tipo "telemetría de vehículo": estado + código,
// productor, diferencia de área, y un mini-preview de la forma del polígono
// (el equivalente al mini-mapa/traza de ruta del command center). Clicking
// selecciona (y el mapa vuela a ella). La tarjeta seleccionada se resalta.
import type { ParcelaGeoRow } from '@/lib/types'
import { ESTADO_COLOR, ESTADO_LABEL } from '@/lib/types'

interface Props {
  parcelas: ParcelaGeoRow[]
  selectedId: string | null
  onSelect: (id: string) => void
  shapes: Map<string, string>
}

export default function ParcelaList({ parcelas, selectedId, onSelect, shapes }: Props) {
  if (parcelas.length === 0) {
    return (
      <p className="p-4 text-sm text-silver">Sin parcelas para mostrar.</p>
    )
  }

  return (
    <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-1.5">
      {parcelas.map((p) => {
        const active = p.id === selectedId
        const shape = shapes.get(p.id)
        const color = ESTADO_COLOR[p.estado_validacion]
        return (
          <li key={p.id}>
            <button
              onClick={() => onSelect(p.id)}
              className={`relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border p-2.5 text-left transition ${
                active
                  ? 'border-orange-500/40 bg-gradient-to-b from-[#1C1E24] to-[#16181D]'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
              }`}
            >
              {/* Mini-preview de la forma del polígono (o placeholder si aún no tiene). */}
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-black/40">
                {shape ? (
                  <svg viewBox="0 0 100 100" className="h-8 w-8" preserveAspectRatio="xMidYMid meet">
                    <polygon points={shape} fill={`${color}33`} stroke={color} strokeWidth={4} strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} title={ESTADO_LABEL[p.estado_validacion]} />
                  <span className="truncate text-sm font-medium text-white">
                    {p.nombre || p.codigo_parcela}
                  </span>
                </span>
                <span className="mt-0.5 block truncate font-mono text-[11px] text-silver">
                  {p.productor_nombre}
                </span>
              </span>

              {p.diferencia_pct !== null && (
                <span
                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    Math.abs(p.diferencia_pct) > 0.15
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-white/5 text-silver'
                  }`}
                >
                  {(p.diferencia_pct * 100).toFixed(0)}%
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
