'use client'

// Client shell that wires together the map, the stats bar, the parcela list
// and the detail panel. It owns the shared UI state (which parcela is selected,
// is the upload modal open) and passes server-fetched data down as props.
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ParcelaGeoRow, GeoStats, UserSession } from '@/lib/types'
import { buildShapes } from '@/lib/geo/shapes'
import GeoSICMap from './GeoSICMap'
import GeoStatsBar from './GeoStatsBar'
import ParcelaList from './ParcelaList'
import ParcelaPanel from './ParcelaPanel'
import KmlUploadModal from './KmlUploadModal'
import AppHeader from '@/components/AppHeader'

interface Props {
  session: UserSession
  parcelas: ParcelaGeoRow[]
  polygons: GeoJSON.FeatureCollection<GeoJSON.Polygon>
  stats: GeoStats
}

export default function GeoSICShell({
  session,
  parcelas,
  polygons,
  stats,
}: Props) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [listaAbierta, setListaAbierta] = useState(false) // drawer de lista en celular

  // Al elegir una parcela en celular, cerramos el cajón de la lista para ver
  // el mapa y el panel de detalle.
  function elegirParcela(id: string | null) {
    setSelectedId(id)
    setListaAbierta(false)
  }

  const selected = useMemo(
    () => parcelas.find((p) => p.id === selectedId) ?? null,
    [parcelas, selectedId],
  )

  // Preview de forma por parcela: normaliza cada polígono a un viewBox 0-100
  // (equivalente al mini-mapa/traza de las "vehicle cards" del command center).
  // Se calcula una sola vez por carga de datos, no en cada render de fila.
  const shapes = useMemo(() => buildShapes(polygons), [polygons])

  // Filter the list by free-text on parcela / productor name or code.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return parcelas
    return parcelas.filter(
      (p) =>
        p.codigo_parcela.toLowerCase().includes(q) ||
        (p.nombre ?? '').toLowerCase().includes(q) ||
        p.productor_nombre.toLowerCase().includes(q) ||
        p.productor_codigo.toLowerCase().includes(q),
    )
  }, [parcelas, query])

  // Refresh server data after an upload or validation changes the DB.
  function refresh() {
    router.refresh()
  }

  const puedeValidar = session.rol === 'admin' || session.rol === 'coordinador'

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      {/* Top bar (shared) with the module-specific upload action */}
      <AppHeader orgNombre={session.orgNombre} rol={session.rol}>
        <button
          onClick={() => setUploadOpen(true)}
          className="rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-orange-400"
        >
          + Subir KML/KMZ
        </button>
      </AppHeader>

      {/* Cuerpo: el mapa ocupa TODO el espacio (borde a borde); la lista, las
          stats y el panel de detalle flotan encima como tarjetas de cristal. */}
      <div className="relative min-h-0 flex-1">
        <GeoSICMap
          parcelas={parcelas}
          polygons={polygons}
          selectedId={selectedId}
          onSelect={elegirParcela}
        />

        {/* Stats flotantes — esquina superior izquierda, solo escritorio
            (en celular ocuparían el ancho que necesita la lista). */}
        <div className="pointer-events-none absolute left-3 right-3 top-3 z-20 hidden md:block">
          <div className="pointer-events-auto inline-flex max-w-full">
            <GeoStatsBar stats={stats} />
          </div>
        </div>

        {/* Fondo oscuro al abrir la lista en celular */}
        {listaAbierta && (
          <button
            aria-label="Cerrar lista"
            onClick={() => setListaAbierta(false)}
            className="absolute inset-0 z-20 bg-black/40 md:hidden"
          />
        )}

        {/* Lista flotante — drawer casi completo en celular, tarjeta acotada
            en escritorio (deja libres las esquinas para los controles del mapa). */}
        <aside
          className={`absolute left-3 top-3 bottom-3 z-30 flex w-80 max-w-[85%] flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl transition-transform md:top-24 ${
            listaAbierta ? 'translate-x-0' : '-translate-x-[120%] md:translate-x-0'
          }`}
        >
          <div className="border-b border-white/10 p-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar parcela o productor…"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-orange-400"
            />
          </div>
          <ParcelaList
            parcelas={filtered}
            selectedId={selectedId}
            onSelect={elegirParcela}
            shapes={shapes}
          />
        </aside>

        {/* Botón para abrir la lista — solo en celular, y solo si está cerrada. */}
        {!listaAbierta && (
          <button
            onClick={() => setListaAbierta(true)}
            className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-3 py-2 text-sm font-medium text-white backdrop-blur-xl md:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
            Parcelas
          </button>
        )}

        {selected && (
          <ParcelaPanel
            parcela={selected}
            puedeValidar={puedeValidar}
            onClose={() => setSelectedId(null)}
            onChanged={refresh}
            shape={shapes.get(selected.id)}
          />
        )}
      </div>

      {uploadOpen && (
        <KmlUploadModal
          parcelas={parcelas}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => {
            setUploadOpen(false)
            refresh()
          }}
        />
      )}
    </div>
  )
}
