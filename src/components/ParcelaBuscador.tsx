'use client'

// Buscador de parcela por nombre o código, con lista filtrada. Reemplaza los
// <select> largos (400+ parcelas) que en el celular no se podían recorrer bien.
// Se usa en la bitácora y en la captura offline de historial.
import { useState } from 'react'
import { codigoCorto } from '@/lib/format'
import type { ParcelaLite } from '@/lib/types'

export default function ParcelaBuscador({
  parcelas,
  value,
  onChange,
  placeholder = 'Buscar parcela por nombre o código…',
}: {
  parcelas: ParcelaLite[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
}) {
  const [q, setQ] = useState('')
  const [abierto, setAbierto] = useState(false)
  const seleccionada = parcelas.find((p) => p.id === value)
  const query = q.trim().toLowerCase()
  const filtradas = query
    ? parcelas.filter(
        (p) =>
          (p.nombre ?? '').toLowerCase().includes(query) ||
          p.codigo_parcela.toLowerCase().includes(query),
      )
    : parcelas

  const etiquetaSel = seleccionada
    ? `${seleccionada.nombre || codigoCorto(seleccionada.codigo_parcela, seleccionada.nombre)} · ${codigoCorto(seleccionada.codigo_parcela, seleccionada.nombre)}`
    : ''

  return (
    <div className="relative">
      <input
        value={abierto ? q : etiquetaSel || q}
        onChange={(e) => { setQ(e.target.value); setAbierto(true) }}
        onFocus={() => { setQ(''); setAbierto(true) }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-black px-3.5 py-2.5 text-sm text-cream outline-none transition-colors focus:border-orange-400"
      />
      {abierto && (
        <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-white/10 bg-surface shadow-lg">
          {filtradas.slice(0, 80).map((p) => {
            const cod = codigoCorto(p.codigo_parcela, p.nombre)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => { onChange(p.id); setAbierto(false); setQ('') }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-surface2"
              >
                <span className="font-medium text-cream">{p.nombre || cod}</span>
                <span className="ml-2 text-xs text-gray-500">{cod}</span>
              </button>
            )
          })}
          {filtradas.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-500">Sin coincidencias</p>
          )}
          {filtradas.length > 80 && (
            <p className="px-3 py-1.5 text-xs text-gray-500">
              Mostrando 80 de {filtradas.length}. Escribe para filtrar.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
