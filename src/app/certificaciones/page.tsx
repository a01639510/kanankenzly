// Certificaciones (Server Component): avance calculado en vivo de los 8
// esquemas más comunes para exportadoras agro, a partir de los mismos datos
// que ya alimentan el Panel — no hay checklist editable todavía, es el punto
// de partida. Ver src/lib/certificaciones.ts para cómo se evalúa cada
// requisito y por qué varios quedan "no rastreados" en vez de inventados.
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionResult } from '@/lib/session'
import { getPanelStats } from '@/lib/data/panel'
import AppHeader from '@/components/AppHeader'
import NoMembership from '@/components/geosic/NoMembership'
import {
  CERTIFICACIONES,
  HOJA_DE_RUTA,
  progresoCertificacion,
  type EstadoRequisito,
  type Requisito,
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

          <HojaDeRutaSection />
        </div>
      </div>
    </div>
  )
}

// Hoja de ruta: la otra mitad del objetivo de la app (llevar la parcela HASTA
// la certificación, no solo medir qué tan lejos está). Marcado como DEMO a
// propósito — son tarjetas de vista previa, sin datos ni botones que
// aparenten funcionar, para tenerlo presente como plan.
function HojaDeRutaSection() {
  return (
    <div id="hoja-de-ruta" className="space-y-3 border-t border-white/10 pt-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-base font-medium text-white">Hoja de ruta</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-amber-400">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Demo — en construcción
        </span>
      </div>
      <p className="max-w-2xl text-sm text-silver">
        El objetivo de la app es llevar cada parcela hasta la certificación, no solo medir qué
        tan lejos está. Esto es la vista previa de lo que falta construir: sin datos reales,
        sin botones funcionales — una estructura para tenerla presente al planear.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {HOJA_DE_RUTA.map((m) => (
          <div
            key={m.slug}
            id={`hoja-${m.slug}`}
            className="relative overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-4"
          >
            <span className="inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-silver">
              Demo
            </span>
            <h3 className="mt-2 text-sm font-semibold text-white">{m.nombre}</h3>
            <p className="mt-1 text-xs text-silver">{m.descripcion}</p>
            {/* Skeleton decorativo: da la sensación de estructura sin simular datos reales. */}
            <div className="mt-3 space-y-1.5 opacity-40">
              <div className="h-1.5 w-4/5 rounded-full bg-white/20" />
              <div className="h-1.5 w-3/5 rounded-full bg-white/20" />
              <div className="h-1.5 w-2/5 rounded-full bg-white/20" />
            </div>
          </div>
        ))}
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
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white">{r.label}</p>
                  <p className="text-xs text-silver">{detalle}</p>
                </div>
                <Accion requisito={r} estado={estado} />
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

// CTA por requisito: si hay un módulo real donde corregirlo y falta/está
// parcial, enlaza ahí. Si es `no_rastreado` pero ya tiene lugar en la hoja de
// ruta, enlaza a esa tarjeta (con la etiqueta DEMO puesta, sin prometer que
// ya existe). Si no hay nada que ofrecer, no se muestra nada — mejor vacío
// que un botón que no lleva a ningún lado.
function Accion({ requisito, estado }: { requisito: Requisito; estado: EstadoRequisito }) {
  if ((estado === 'faltante' || estado === 'parcial') && requisito.modulo) {
    return (
      <Link
        href={requisito.modulo.href}
        className="shrink-0 whitespace-nowrap text-xs text-orange-400 hover:text-orange-300"
      >
        Corregir en {requisito.modulo.label} →
      </Link>
    )
  }
  if (estado === 'no_rastreado' && requisito.hojaDeRuta) {
    return (
      <a
        href={`#hoja-${requisito.hojaDeRuta}`}
        className="shrink-0 whitespace-nowrap text-xs text-silver hover:text-white"
      >
        En hoja de ruta →
      </a>
    )
  }
  return null
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
