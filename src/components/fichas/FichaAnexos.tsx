'use client'

// Panel que aparece justo después de guardar una ficha (#4).
//
// En campo la inspección es UN acto: la ficha, la bitácora del año y el
// historial de la parcela se levantan de corrido frente al productor. Antes la
// app te sacaba a /fichas al guardar y había que volver a buscar todo; aquí la
// bitácora y el historial se capturan sin moverse, con la parcela ya puesta.
//
// Funciona igual sin señal: los editores encolan y suben solos.
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BitacoraEditor from '@/components/bitacora/BitacoraEditor'
import HistorialEditor from '@/components/historial/HistorialEditor'
import { codigoCorto } from '@/lib/format'
import { listarTodosPendientes, type PendienteResumen } from '@/lib/offline/sync'
import type { ParcelaLite } from '@/lib/types'

type Anexo = 'ninguno' | 'bitacora' | 'historial'

export default function FichaAnexos({
  online,
  fichaId,
  editada,
  parcelas,
  etiquetaProductor,
  onSeguirEditando,
}: {
  online: boolean
  fichaId: string | null
  editada: boolean
  parcelas: ParcelaLite[]
  etiquetaProductor: string
  onSeguirEditando: () => void
}) {
  const router = useRouter()
  const [anexo, setAnexo] = useState<Anexo>('ninguno')
  const [hechos, setHechos] = useState<Anexo[]>([])
  const [pendientes, setPendientes] = useState<PendienteResumen[]>([])

  // Sin señal, lo importante es que el inspector VEA qué lleva por subir.
  useEffect(() => {
    listarTodosPendientes().then(setPendientes).catch(() => {})
  }, [anexo])

  const parcela = parcelas[0] ?? null
  const label = parcela
    ? `${parcela.nombre || codigoCorto(parcela.codigo_parcela, parcela.nombre)} · ${codigoCorto(parcela.codigo_parcela, parcela.nombre)}`
    : ''

  function terminar(cual: Anexo) {
    setHechos((h) => (h.includes(cual) ? h : [...h, cual]))
    setAnexo('ninguno')
  }

  if (anexo === 'bitacora' && parcela) {
    return (
      <Marco titulo={`Bitácora · ${label}`} onVolver={() => setAnexo('ninguno')}>
        <BitacoraEditor
          mode="editar"
          parcelaFija={{ id: parcela.id, label }}
          anioInicial={new Date().getFullYear()}
          fichaId={fichaId ?? undefined}
          onGuardada={() => terminar('bitacora')}
        />
      </Marco>
    )
  }

  if (anexo === 'historial' && parcela) {
    return (
      <Marco titulo={`Historial · ${label}`} onVolver={() => setAnexo('ninguno')}>
        <HistorialEditor
          parcelaId={parcela.id}
          parcelaLabel={label}
          aniosIniciales={[]}
          onGuardado={() => terminar('historial')}
        />
      </Marco>
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div
        className={`rounded-2xl border p-6 ${
          online ? 'border-green-500/20 bg-green-500/5' : 'border-amber-500/20 bg-amber-500/5'
        }`}
      >
        <h2 className="text-base font-normal text-cream">
          {online
            ? editada
              ? 'Cambios guardados'
              : 'Ficha guardada'
            : 'Guardada en el dispositivo'}
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          {online
            ? `${etiquetaProductor} — ya está en el sistema.`
            : `${etiquetaProductor} — sin señal. Se sube sola en cuanto vuelva la conexión; no cierres sesión.`}
        </p>
      </div>

      {parcela ? (
        <div className="mt-5">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-gray-500">
            Anexos de esta inspección
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <BotonAnexo
              titulo="Bitácora del año"
              detalle={`Parcela ${codigoCorto(parcela.codigo_parcela, parcela.nombre)}`}
              hecho={hechos.includes('bitacora')}
              onClick={() => setAnexo('bitacora')}
            />
            <BotonAnexo
              titulo="Historial de manejo"
              detalle={`Parcela ${codigoCorto(parcela.codigo_parcela, parcela.nombre)}`}
              hecho={hechos.includes('historial')}
              onClick={() => setAnexo('historial')}
            />
          </div>
        </div>
      ) : null}

      {pendientes.length > 0 && (
        <div className="mt-5 rounded-xl border border-white/10 bg-surface p-4">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-gray-500">
            {pendientes.length} por subir
          </p>
          <ul className="space-y-1 text-sm text-gray-400">
            {pendientes.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-3">
                <span className="truncate">
                  <span className="mr-2 rounded-full bg-white/5 px-1.5 py-0.5 text-xs text-gray-400">
                    {p.tipo}
                  </span>
                  {p.etiqueta}
                </span>
                <span className="shrink-0 text-xs text-gray-500">
                  {new Date(p.creada_en).toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={onSeguirEditando}
          className="rounded-full border border-white/10 bg-surface px-4 py-2 text-sm font-medium text-cream transition hover:border-orange-500/40"
        >
          Seguir editando la ficha
        </button>
        {online && fichaId && (
          <Link
            href={`/fichas/${fichaId}`}
            className="rounded-full border border-white/10 bg-surface px-4 py-2 text-sm font-medium text-cream transition hover:border-orange-500/40"
          >
            Ver ficha
          </Link>
        )}
        <button
          onClick={() => {
            router.push('/fichas')
            router.refresh()
          }}
          className="rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-orange-400"
        >
          Terminar
        </button>
      </div>
    </div>
  )
}

function BotonAnexo({
  titulo,
  detalle,
  hecho,
  onClick,
}: {
  titulo: string
  detalle: string
  hecho: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition hover:border-orange-400 ${
        hecho ? 'border-green-500/20 bg-green-500/5' : 'border-white/10 bg-surface'
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-cream">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${hecho ? 'bg-green-400' : 'bg-gray-500'}`} />
        {titulo}
      </div>
      <div className="mt-0.5 text-xs text-gray-500">{detalle}</div>
    </button>
  )
}

function Marco({
  titulo,
  onVolver,
  children,
}: {
  titulo: string
  onVolver: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-3 border-b border-white/10 bg-surface px-4 py-2.5">
        <button
          onClick={onVolver}
          className="rounded-full px-2 py-1 text-sm text-gray-500 transition hover:text-cream"
        >
          ← Atrás
        </button>
        <span className="text-sm font-normal text-cream">{titulo}</span>
      </div>
      {children}
    </div>
  )
}
