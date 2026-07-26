// Lista de historiales por parcela (Server Component).
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionResult } from '@/lib/session'
import { getParcelasConHistorial } from '@/lib/data/historial'
import AppHeader from '@/components/AppHeader'
import NoMembership from '@/components/geosic/NoMembership'
import { codigoCorto } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function HistorialPage() {
  const result = await getSessionResult()
  if (result.kind === 'no-auth') redirect('/login')
  if (result.kind === 'no-membership') return <NoMembership />

  const parcelas = await getParcelasConHistorial()

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <AppHeader orgNombre={result.session.orgNombre} rol={result.session.rol}>
        <Link
          href="/historial/nueva"
          className="rounded-full bg-orange-500 px-3 py-1.5 text-sm font-medium text-black transition hover:bg-orange-400"
        >
          + Nuevo historial
        </Link>
      </AppHeader>

      <div className="min-h-0 flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">
          {parcelas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/40 p-10 text-center backdrop-blur-xl">
              <p className="text-sm text-silver">
                Aún no hay historiales. Crea el primero con “Nuevo historial”.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-white/10 text-left font-mono text-[11px] uppercase tracking-wide text-silver">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Parcela</th>
                    <th className="px-4 py-2.5 font-medium">Productor</th>
                    <th className="px-4 py-2.5 font-medium">Años</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {parcelas.map((p) => (
                    <tr key={p.parcela_id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-white">
                          {p.parcela_nombre || codigoCorto(p.parcela_codigo, p.parcela_nombre)}
                        </div>
                        <div className="text-xs text-silver">
                          {codigoCorto(p.parcela_codigo, p.parcela_nombre)}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-silver">{p.productor_nombre}</td>
                      <td className="px-4 py-2.5 text-silver">
                        {p.anios.sort((a, b) => a - b).join(', ')}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/historial/${p.parcela_id}`}
                          className="text-sm font-medium text-orange-400 hover:text-orange-300"
                        >
                          Abrir →
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
