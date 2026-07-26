// Vista previa de un módulo de la hoja de ruta — DEMO explícito, sin datos
// reales ni botones funcionales. El objetivo es dar una idea de estructura
// para planear, no simular una función que no existe todavía. Ver
// src/lib/certificaciones.ts (HOJA_DE_RUTA) para la lista completa.
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSessionResult } from '@/lib/session'
import AppHeader from '@/components/AppHeader'
import NoMembership from '@/components/geosic/NoMembership'
import { HOJA_DE_RUTA } from '@/lib/certificaciones'

export const dynamic = 'force-dynamic'

export default async function HojaDeRutaDetallePage({
  params,
}: {
  params: { slug: string }
}) {
  const result = await getSessionResult()
  if (result.kind === 'no-auth') redirect('/login')
  if (result.kind === 'no-membership') return <NoMembership />

  const modulo = HOJA_DE_RUTA.find((m) => m.slug === params.slug)
  if (!modulo) notFound()

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <AppHeader orgNombre={result.session.orgNombre} rol={result.session.rol} />
      <div className="min-h-0 flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-5">
          <Link href="/certificaciones#hoja-de-ruta" className="text-sm text-silver hover:text-white">
            ← Volver a Certificaciones
          </Link>

          {/* Letrero DEMO — bien visible, arriba de todo. */}
          <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3.5l9.5 16.5H2.5z" /><path d="M12 10v4" /><path d="M12 17h.01" />
              </svg>
            </span>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-amber-400">
                Demo — en construcción
              </p>
              <p className="text-sm text-white">
                Esta es una vista previa de estructura, sin datos reales ni funciones activas.
                Ningún botón de esta página guarda ni envía nada todavía.
              </p>
            </div>
          </div>

          <div>
            <h1 className="text-xl font-medium text-white">{modulo.nombre}</h1>
            <p className="mt-1 text-sm text-silver">{modulo.descripcion}</p>
          </div>

          <Esqueleto slug={modulo.slug} />
        </div>
      </div>
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl ${className}`}>
      {children}
    </div>
  )
}

// Etiqueta fantasma: da la sensación de contenido sin inventar un dato.
function Barra({ w = 'w-full' }: { w?: string }) {
  return <div className={`h-2.5 rounded-full bg-white/10 ${w}`} />
}

function BotonDeshabilitado({ children }: { children: React.ReactNode }) {
  return (
    <button
      disabled
      title="Vista previa — todavía no funciona"
      className="cursor-not-allowed rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-silver opacity-60"
    >
      {children}
    </button>
  )
}

function Esqueleto({ slug }: { slug: string }) {
  switch (slug) {
    case 'documentos':
      return (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-wide text-silver">
              Expediente — parcela / productor
            </p>
            <BotonDeshabilitado>+ Subir documento</BotonDeshabilitado>
          </div>
          <div className="space-y-2">
            {['Contrato de compraventa', 'Acta de asamblea', 'Análisis de suelo', 'Comprobante de pago'].map((tipo) => (
              <div key={tipo} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-silver">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 2.5h8l4 4v15H6z" /><path d="M14 2.5v4h4" /></svg>
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-sm text-white">{tipo}</p>
                  <Barra w="w-1/3" />
                </div>
                <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-silver">v1</span>
              </div>
            ))}
          </div>
        </Card>
      )
    case 'dds':
      return (
        <Card className="space-y-4">
          <p className="font-mono text-[11px] uppercase tracking-wide text-silver">
            Declaración de Diligencia Debida — vista previa
          </p>
          <div className="space-y-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            {['Operador', 'Parcela(s) incluidas', 'Coordenadas geográficas', 'Evaluación de riesgo', 'Fecha y firma'].map((campo) => (
              <div key={campo} className="flex items-center justify-between gap-4">
                <span className="text-xs text-silver">{campo}</span>
                <Barra w="w-2/5" />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <BotonDeshabilitado>Vista previa PDF</BotonDeshabilitado>
            <BotonDeshabilitado>Exportar a EU TRACES</BotonDeshabilitado>
          </div>
        </Card>
      )
    case 'auditorias':
      return (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-wide text-silver">
              Próximas auditorías
            </p>
            <BotonDeshabilitado>+ Programar auditoría</BotonDeshabilitado>
          </div>
          <div className="space-y-2">
            {[
              { esquema: 'Global G.A.P.', estado: 'Programada' },
              { esquema: 'Rainforest Alliance', estado: 'En preparación' },
              { esquema: 'Mayacert', estado: 'Pendiente de asignar' },
            ].map((a) => (
              <div key={a.esquema} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div className="space-y-1.5">
                  <p className="text-sm text-white">{a.esquema}</p>
                  <Barra w="w-24" />
                </div>
                <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-xs text-silver">{a.estado}</span>
              </div>
            ))}
          </div>
        </Card>
      )
    case 'auditoria-social':
      return (
        <Card className="space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-wide text-silver">
            Checklist SMETA / ETI — vista previa
          </p>
          {['Jornales y horas trabajadas', 'Condiciones de trabajo e higiene', 'Sin trabajo infantil ni forzado', 'Plan de acciones correctivas'].map((item) => (
            <div key={item} className="flex items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-dashed border-white/30" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-sm text-white">{item}</p>
                <Barra w="w-2/3" />
              </div>
            </div>
          ))}
        </Card>
      )
    default:
      return (
        <Card className="space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-wide text-silver">Estructura preliminar</p>
          <div className="space-y-2">
            <Barra />
            <Barra w="w-4/5" />
            <Barra w="w-3/5" />
          </div>
          <div className="flex justify-end">
            <BotonDeshabilitado>Configurar</BotonDeshabilitado>
          </div>
        </Card>
      )
  }
}
