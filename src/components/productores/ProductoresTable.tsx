'use client'

// Sortable, searchable table of productores with their aggregates: parcelas,
// hectares, geographic coverage and inspection status. Read-only dashboard.
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProductorDashboardRow, TipoCultivo } from '@/lib/types'

type SortKey =
  | 'nombre_completo'
  | 'num_parcelas'
  | 'hectareas_totales'
  | 'parcelas_con_poligono'
  | 'ultima_inspeccion'

const CULTIVO_LABEL: Record<TipoCultivo, string> = {
  cafe: 'Café',
  tropical: 'Tropical',
  mixto: 'Mixto',
}

export default function ProductoresTable({
  productores,
}: {
  productores: ProductorDashboardRow[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('nombre_completo')
  const [asc, setAsc] = useState(true)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? productores.filter(
          (p) =>
            p.nombre_completo.toLowerCase().includes(q) ||
            p.codigo.toLowerCase().includes(q) ||
            (p.comunidad ?? '').toLowerCase().includes(q) ||
            (p.municipio ?? '').toLowerCase().includes(q),
        )
      : productores

    const sorted = [...filtered].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      // nulls last
      if (av === null) return 1
      if (bv === null) return -1
      if (av < bv) return asc ? -1 : 1
      if (av > bv) return asc ? 1 : -1
      return 0
    })
    return sorted
  }, [productores, query, sortKey, asc])

  function toggleSort(key: SortKey) {
    if (key === sortKey) setAsc((v) => !v)
    else {
      setSortKey(key)
      setAsc(true)
    }
  }

  // Org-wide totals for the summary cards.
  const totals = useMemo(
    () => ({
      productores: productores.length,
      parcelas: productores.reduce((s, p) => s + p.num_parcelas, 0),
      hectareas: productores.reduce((s, p) => s + Number(p.hectareas_totales), 0),
      conPoligono: productores.reduce(
        (s, p) => s + p.parcelas_con_poligono,
        0,
      ),
    }),
    [productores],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Summary cards */}
      <div className="flex items-stretch divide-x divide-white/10 border-b border-white/10 bg-black/40 text-sm backdrop-blur-xl">
        <Summary label="Productores" value={totals.productores} />
        <Summary label="Parcelas" value={totals.parcelas} />
        <Summary
          label="Hectáreas declaradas"
          value={`${totals.hectareas.toFixed(1)} ha`}
        />
        <Summary
          label="Parcelas con polígono"
          value={totals.conPoligono}
          accent="#38bdf8"
        />
      </div>

      <div className="border-b border-white/5 bg-black/40 p-2 backdrop-blur-xl">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar productor, código, comunidad o municipio…"
          className="w-full max-w-md rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white outline-none transition-colors focus:border-orange-400"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-black/60 text-left font-mono text-[11px] uppercase tracking-wide text-silver border-b border-white/10 backdrop-blur-xl">
            <tr>
              <Th onClick={() => toggleSort('nombre_completo')} active={sortKey === 'nombre_completo'} asc={asc}>
                Productor
              </Th>
              <th className="px-4 py-2 font-medium">Comunidad</th>
              <th className="px-4 py-2 font-medium">Cultivo</th>
              <Th onClick={() => toggleSort('num_parcelas')} active={sortKey === 'num_parcelas'} asc={asc} numeric>
                Parcelas
              </Th>
              <Th onClick={() => toggleSort('hectareas_totales')} active={sortKey === 'hectareas_totales'} asc={asc} numeric>
                Hectáreas
              </Th>
              <Th onClick={() => toggleSort('parcelas_con_poligono')} active={sortKey === 'parcelas_con_poligono'} asc={asc} numeric>
                Cobertura geo
              </Th>
              <th className="px-4 py-2 text-right font-medium">Fichas</th>
              <Th onClick={() => toggleSort('ultima_inspeccion')} active={sortKey === 'ultima_inspeccion'} asc={asc}>
                Última inspección
              </Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const cobertura =
                p.num_parcelas > 0
                  ? Math.round((p.parcelas_con_poligono / p.num_parcelas) * 100)
                  : 0
              return (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/productores/${p.id}`)}
                  className="cursor-pointer border-b border-white/5 hover:bg-white/5"
                >
                  <td className="px-4 py-2">
                    <div className="font-medium text-white">
                      {p.nombre_completo}
                    </div>
                    <div className="text-xs text-silver">{p.codigo}</div>
                  </td>
                  <td className="px-4 py-2 text-silver">
                    {p.comunidad || '—'}
                    {p.municipio ? (
                      <span className="text-silver">, {p.municipio}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 text-silver">
                    {CULTIVO_LABEL[p.tipo_productor]}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-silver">
                    {p.num_parcelas}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-silver">
                    {Number(p.hectareas_totales).toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                    <CoberturaBar
                      pct={cobertura}
                      con={p.parcelas_con_poligono}
                      total={p.num_parcelas}
                    />
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-silver">
                    {p.num_fichas}
                  </td>
                  <td className="px-4 py-2 text-silver">
                    {p.ultima_inspeccion ?? (
                      <span className="text-amber-400">Sin inspección</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-silver">
                  Sin productores que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Summary({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: string
}) {
  return (
    <div className="flex flex-1 flex-col px-4 py-2">
      <span className="font-mono text-[11px] tracking-wide text-silver">{label}</span>
      <span
        className={`text-lg font-medium leading-tight ${accent ? '' : 'text-white'}`}
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </span>
    </div>
  )
}

function Th({
  children,
  onClick,
  active,
  asc,
  numeric,
}: {
  children: React.ReactNode
  onClick: () => void
  active: boolean
  asc: boolean
  numeric?: boolean
}) {
  return (
    <th
      onClick={onClick}
      className={`cursor-pointer select-none px-4 py-2 font-medium hover:text-white ${
        numeric ? 'text-right' : ''
      } ${active ? 'text-orange-400' : ''}`}
    >
      {children}
      {active ? (asc ? ' ▲' : ' ▼') : ''}
    </th>
  )
}

function CoberturaBar({
  pct,
  con,
  total,
}: {
  pct: number
  con: number
  total: number
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-sky-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-silver">
        {con}/{total}
      </span>
    </div>
  )
}
