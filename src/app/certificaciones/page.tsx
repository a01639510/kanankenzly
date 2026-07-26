// Certificaciones (Server Component): avance calculado en vivo de los 8
// esquemas más comunes para exportadoras agro, a partir de los mismos datos
// que ya alimentan el Panel — no hay checklist editable todavía, es el punto
// de partida. Ver src/lib/certificaciones.ts para cómo se evalúa cada
// requisito y por qué varios quedan "no rastreados" en vez de inventados.
import { redirect } from 'next/navigation'
import { getSessionResult } from '@/lib/session'
import { getPanelStats } from '@/lib/data/panel'
import AppHeader from '@/components/AppHeader'
import NoMembership from '@/components/geosic/NoMembership'
import {
  CERTIFICACIONES,
  progresoCertificacion,
  type EstadoRequisito,
} from '@/lib/certificaciones'

export const dynamic = 'force-dynamic'

const ESTADO_COLOR: Record<EstadoRequisito, string> = {
  cumplido: '#34d399',
  parcial: '#fbbf24',
  faltante: '#f87171',
  no_rastreado: '#8E939D',
}

const ESTADO_LABEL: Record<EstadoRequisito, string> = {
  cumplido: 'Cumplido',
  parcial: 'Parcial',
  faltante: 'Faltante',
  no_rastreado: 'No rastreado',
}

export default async function CertificacionesPage() {
  const result = await getSessionResult()
  if (result.kind === 'no-auth') redirect('/login')
  if (result.kind === 'no-membership') return <NoMembership />

  const s = await getPanelStats()
  const conAvance = CERTIFICACIONES.filter((c) => progresoCertificacion(c, s) >= 0.5).length

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <AppHeader orgNombre={result.session.orgNombre} rol={result.session.rol} />
      <div className="min-h-0 flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <h1 className="text-xl font-medium text-white">Certificaciones</h1>
            <p className="mt-1 text-sm text-silver">
              Avance real de {result.session.orgNombre} contra los requisitos de cada esquema —
              calculado sobre GeoSIC, tamizado EUDR, fichas y bitácoras. Lo que el sistema no
              rastrea todavía se marca así, no se inventa.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-black/40 p-3 backdrop-blur-xl">
            <span className="font-mono text-[11px] tracking-wide text-silver">
              {conAvance} de {CERTIFICACIONES.length} esquemas con 50%+ de avance
            </span>
            <div className="flex items-center gap-3 text-[11px] text-silver">
              {(['cumplido', 'parcial', 'faltante', 'no_rastreado'] as const).map((e) => (
                <span key={e} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ESTADO_COLOR[e] }} />
                  {ESTADO_LABEL[e]}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {CERTIFICACIONES.map((cert) => (
              <CertCard key={cert.slug} cert={cert} stats={s} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function CertCard({
  cert,
  stats,
}: {
  cert: (typeof CERTIFICACIONES)[number]
  stats: Parameters<typeof progresoCertificacion>[1]
}) {
  const progreso = progresoCertificacion(cert, stats)
  const pct = Math.round(progreso * 100)

  return (
    <div className="relative overflow-hidden rounded-[20px] border border-white/10 bg-black/50 p-5 backdrop-blur-xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-14 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.06),_transparent_70%)]"
      />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white">{cert.nombre}</h2>
            <p className="font-mono text-[10px] uppercase tracking-wide text-silver">{cert.tipo}</p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xl font-bold text-white">{pct}%</div>
          </div>
        </div>

        <p className="mt-1.5 text-xs text-silver">{cert.alcance}</p>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
        </div>

        <ul className="mt-4 space-y-2.5">
          {cert.requisitos.map((r) => {
            const { estado, detalle } = r.evaluar(stats)
            return (
              <li key={r.label} className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0" style={{ color: ESTADO_COLOR[estado] }}>
                  <IconoEstado estado={estado} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-white">{r.label}</p>
                  <p className="text-xs text-silver">{detalle}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function IconoEstado({ estado }: { estado: EstadoRequisito }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (estado) {
    case 'cumplido':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M8.5 12.3l2.3 2.3 4.7-4.8" />
        </svg>
      )
    case 'parcial':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4a8 8 0 010 16z" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'faltante':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v5" />
          <path d="M12 16h.01" />
        </svg>
      )
    case 'no_rastreado':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" strokeDasharray="3 3" />
        </svg>
      )
  }
}
