'use client'

// Lista lateral: cada parcela con su NDVI y un punto de color por alerta.
import type { ParcelaSateliteRow } from '@/lib/satelite/indices'
import { ALERTA_COLOR, ALERTA_LABEL, fmtNdvi, colorNdvi } from '@/lib/satelite/indices'

interface Props {
  parcelas: ParcelaSateliteRow[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export default function ParcelaSatList({ parcelas, selectedId, onSelect }: Props) {
  if (parcelas.length === 0) {
    return (
      <p className="p-4 text-sm text-silver">
        No hay parcelas que coincidan con el filtro.
      </p>
    )
  }

  return (
    <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-1.5">
      {parcelas.map((p) => {
        const alerta = p.alerta ?? 'sin_datos'
        const active = p.id === selectedId
        return (
          <li key={p.id}>
            <button
              onClick={() => onSelect(p.id)}
              className={`flex w-full items-center gap-2.5 rounded-2xl border p-2.5 text-left transition ${
                active
                  ? 'border-orange-500/40 bg-gradient-to-b from-[#1C1E24] to-[#16181D]'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
              }`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: ALERTA_COLOR[alerta] }}
                title={ALERTA_LABEL[alerta]}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">
                  {p.nombre || p.codigo_parcela}
                </span>
                <span className="block truncate font-mono text-[11px] text-silver">
                  {p.productor_nombre}
                </span>
              </span>
              <span
                className="shrink-0 text-sm font-medium tabular-nums"
                style={{ color: colorNdvi(p.ndvi_promedio) }}
              >
                {fmtNdvi(p.ndvi_promedio)}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
