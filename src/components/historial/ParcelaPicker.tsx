'use client'

// Selector de parcela que navega al historial de la parcela elegida.
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ParcelaLite } from '@/lib/types'
import { codigoCorto } from '@/lib/format'

export default function ParcelaPicker({ parcelas }: { parcelas: ParcelaLite[] }) {
  const router = useRouter()
  const [q, setQ] = useState('')

  const lista = useMemo(() => {
    const s = q.trim().toLowerCase()
    return parcelas
      .filter(
        (p) =>
          !s ||
          (p.nombre ?? '').toLowerCase().includes(s) ||
          p.codigo_parcela.toLowerCase().includes(s),
      )
      .slice(0, 100)
  }, [parcelas, q])

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="mb-3 text-lg font-normal text-cream">
        Elige una parcela para su historial
      </h1>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar parcela o código…"
        className="mb-3 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-cream outline-none transition-colors focus:border-orange-400"
      />
      <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-white/10 bg-surface">
        {lista.map((p) => {
          const cod = codigoCorto(p.codigo_parcela, p.nombre)
          return (
            <button
              key={p.id}
              onClick={() => router.push(`/historial/${p.id}`)}
              className="flex w-full items-center justify-between border-b border-white/5 px-3 py-2 text-left text-sm hover:bg-surface2"
            >
              <span className="font-medium text-cream">{p.nombre || cod}</span>
              <span className="text-xs text-gray-500">{cod}</span>
            </button>
          )
        })}
        {lista.length === 0 && (
          <p className="p-4 text-sm text-gray-500">Sin coincidencias.</p>
        )}
      </div>
    </div>
  )
}
