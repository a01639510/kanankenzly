// Indicadores del módulo satelital, mismo formato que GeoStatsBar: grupo de
// tiles bento flotante sobre el mapa (ver SateliteShell), cada tile es su
// propia tarjeta de cristal — ya no hay fondo de barra detrás.
import type { SatStats } from '@/lib/satelite/indices'
import { fmtNdvi, colorNdvi, ALERTA_COLOR } from '@/lib/satelite/indices'

export default function SatStatsBar({ stats }: { stats: SatStats }) {
  const pctMonitoreadas =
    stats.con_poligono > 0
      ? Math.round((stats.monitoreadas / stats.con_poligono) * 100)
      : 0

  return (
    <div className="flex gap-1.5 overflow-x-auto">
      <Stat
        label="Monitoreadas"
        value={`${stats.monitoreadas} · ${pctMonitoreadas}%`}
        accent="#0ea5e9"
      />
      <Stat
        label="NDVI promedio"
        value={fmtNdvi(stats.ndvi_promedio)}
        accent={colorNdvi(stats.ndvi_promedio)}
      />
      <Stat
        label="Alertas activas"
        value={stats.alertas_activas}
        accent={ALERTA_COLOR.estres_hidrico}
      />
      <Stat label="Críticas" value={stats.criticas} accent={ALERTA_COLOR.critico} />
      <Stat label="Sin medición" value={stats.sin_datos} accent="#8E939D" />
      <Stat
        label="Última imagen"
        value={stats.ultima_actualizacion ?? '—'}
      />
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
