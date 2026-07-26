// Lista de bitácoras (Server Component).
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionResult } from '@/lib/session'
import { getBitacoras } from '@/lib/data/bitacora'
import AppHeader from '@/components/AppHeader'
import NoMembership from '@/components/geosic/NoMembership'

export const dynamic = 'force-dynamic'

export default async function BitacoraPage() {
  const result = await getSessionResult()
  if (result.kind === 'no-auth') redirect('/login')
  if (result.kind === 'no-membership') return <NoMembership />

  const bitacoras = await getBitacoras()

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <AppHeader orgNombre={result.session.orgNombre} rol={result.session.rol}>
        <Link
          href="/bitacora/nueva"
          className="rounded-full bg-orange-500 px-3 py-1.5 text-sm font-medium text-black transition hover:bg-orange-400"
        >
          + Nueva bitácora
        </Link>
      </AppHeader>

      <div className="min-h-0 flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">
          {bitacoras.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/40 p-10 text-center backdrop-blur-xl">
              <p className="text-sm text-silver">
                Aún no hay bitácoras. Crea la primera con “Nueva bitácora”.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-white/10 text-left font-mono text-[11px] uppercase tracking-wide text-silver">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Parcela</th>
                    <th className="px-4 py-2.5 font-medium">Productor</th>
                    <th className="px-4 py-2.5 text-right font-medium">Año</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {bitacoras.map((b) => (
                    <tr key={b.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-white">
                          {b.parcela_nombre || b.parcela_codigo}
                        </div>
                        <div className="text-xs text-silver">{b.parcela_codigo}</div>
                      </td>
                      <td className="px-4 py-2.5 text-silver">{b.productor_nombre}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-silver">
                        {b.anio}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/bitacora/${b.id}`}
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
