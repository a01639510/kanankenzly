// Lista de fichas (Server Component).
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionResult } from '@/lib/session'
import { getFichas } from '@/lib/data/fichas'
import AppHeader from '@/components/AppHeader'
import NoMembership from '@/components/geosic/NoMembership'
import {
  TIPO_FICHA_LABEL,
  ESTADO_FICHA_LABEL,
  type EstadoFicha,
} from '@/lib/types'

export const dynamic = 'force-dynamic'

const ESTADO_COLOR: Record<EstadoFicha, string> = {
  borrador: 'bg-white/5 text-gray-400',
  en_revision: 'bg-amber-500/10 text-amber-400',
  aprobada: 'bg-green-500/10 text-green-400',
  pdf_generado: 'bg-sky-500/10 text-sky-400',
  requiere_correccion: 'bg-red-500/10 text-red-400',
}

export default async function FichasPage() {
  const result = await getSessionResult()
  if (result.kind === 'no-auth') redirect('/login')
  if (result.kind === 'no-membership') return <NoMembership />

  const fichas = await getFichas()

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-black">
      <AppHeader orgNombre={result.session.orgNombre} rol={result.session.rol}>
        <Link
          href="/fichas/nueva"
          className="rounded-full bg-orange-500 px-3 py-1.5 text-sm font-medium text-black transition hover:bg-orange-400"
        >
          + Nueva ficha
        </Link>
      </AppHeader>

      <div className="min-h-0 flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-5xl">
          {fichas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-surface p-10 text-center">
              <p className="text-sm text-gray-500">
                Aún no hay fichas. Crea la primera con “Nueva ficha”.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-surface">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left font-mono text-[11px] uppercase tracking-wide text-gray-500 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Tipo</th>
                    <th className="px-4 py-2.5 font-medium">Productor</th>
                    <th className="px-4 py-2.5 text-right font-medium">Parcelas</th>
                    <th className="px-4 py-2.5 text-right font-medium">Área</th>
                    <th className="px-4 py-2.5 font-medium">Fecha</th>
                    <th className="px-4 py-2.5 font-medium">Estado</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {fichas.map((f) => (
                    <tr
                      key={f.id}
                      className="border-b border-white/5 hover:bg-surface2"
                    >
                      <td className="px-4 py-2.5 font-medium text-cream">
                        {TIPO_FICHA_LABEL[f.tipo]}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-cream">{f.productor_nombre}</div>
                        <div className="text-xs text-gray-500">
                          {f.productor_codigo}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-gray-400">
                        {f.num_parcelas}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-gray-400">
                        {f.area_cultivada_ha !== null
                          ? `${Number(f.area_cultivada_ha).toFixed(2)} ha`
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400">
                        {f.fecha_inspeccion ?? '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_COLOR[f.estado]}`}
                        >
                          {ESTADO_FICHA_LABEL[f.estado]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        {result.session.rol !== 'solo_lectura' && (
                          <Link
                            href={`/fichas/${f.id}/editar`}
                            className="mr-3 text-sm font-medium text-gray-500 hover:text-cream"
                          >
                            Editar
                          </Link>
                        )}
                        <Link
                          href={`/fichas/${f.id}`}
                          className="text-sm font-medium text-orange-400 hover:text-orange-300"
                        >
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
