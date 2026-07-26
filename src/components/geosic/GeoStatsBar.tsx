// Cockpit strip: grupo de tiles bento con la cobertura del módulo (mapeadas,
// validadas, críticas, sin polígono) — el "telemetry summary" del command
// center. Flota sobre el mapa (ver GeoSICShell); cada tile es su propia
// tarjeta de cristal, no hay fondo de barra detrás.
import type { GeoStats } from '@/lib/types'

export default function GeoStatsBar({ stats }: { stats: GeoStats }) {
  const pctConPoligono =
    stats.total > 0 ? Math.round((stats.con_poligono / stats.total) * 100) : 0
  const pctValidadas =
    stats.con_poligono > 0
      ? Math.round((stats.validadas / stats.con_poligono) * 100)
      : 0

  return (
    <div className="flex gap-1.5 overflow-x-auto">
      <Stat label="Parcelas" value={stats.total} />
      <Stat label="Con polígono" value={`${stats.con_poligono} · ${pctConPoligono}%`} />
      <Stat label="Validadas" value={`${stats.validadas} · ${pctValidadas}%`} accent="#34d399" />
      <Stat label="Diferencia crítica" value={stats.diferencia_critica} accent={stats.diferencia_critica > 0 ? '#f87171' : undefined} />
      <Stat label="Sin polígono" value={stats.sin_poligono} />
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
    <div className="relative shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/50 px-3 py-2 backdrop-blur-xl">
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
