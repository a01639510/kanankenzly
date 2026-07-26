// Cockpit strip: fila de tiles bento con la cobertura del módulo (mapeadas,
// validadas, críticas, sin polígono) — el "telemetry summary" del command
// center, siempre visible arriba del split view lista/mapa.
import type { GeoStats } from '@/lib/types'

export default function GeoStatsBar({ stats }: { stats: GeoStats }) {
  const pctConPoligono =
    stats.total > 0 ? Math.round((stats.con_poligono / stats.total) * 100) : 0
  const pctValidadas =
    stats.con_poligono > 0
      ? Math.round((stats.validadas / stats.con_poligono) * 100)
      : 0

  return (
    <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-white/10 bg-graphite p-1.5">
      <Stat label="Parcelas" value={stats.total} />
      <Stat
        label="Con polígono"
        value={`${stats.con_poligono} · ${pctConPoligono}%`}
        accent="#38bdf8"
      />
      <Stat
        label="Validadas"
        value={`${stats.validadas} · ${pctValidadas}%`}
        accent="#4ade80"
      />
      <Stat
        label="Diferencia crítica"
        value={stats.diferencia_critica}
        accent="#f87171"
      />
      <Stat label="Sin polígono" value={stats.sin_poligono} accent="#8E939D" />
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: string
}) {
  return (
    <div className="relative shrink-0 basis-1/3 overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-b from-[#1C1E24] to-[#16181D] px-3 py-2 sm:basis-1/4 md:flex-1 md:basis-0">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.06),_transparent_70%)]"
      />
      <div className="relative">
        <span className="font-mono text-[11px] tracking-wide text-silver">{label}</span>
        <span
          className="block text-lg font-semibold leading-tight text-white"
          style={accent ? { color: accent } : undefined}
        >
          {value}
        </span>
      </div>
    </div>
  )
}
