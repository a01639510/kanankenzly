'use client'

// Client shell that wires together the map, the stats bar, the parcela list
// and the detail panel. It owns the shared UI state (which parcela is selected,
// is the upload modal open) and passes server-fetched data down as props.
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ParcelaGeoRow, GeoStats, UserSession } from '@/lib/types'
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
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-graphite">
      {/* Top bar (shared) with the module-specific upload action */}
      <AppHeader orgNombre={session.orgNombre} rol={session.rol}>
        <button
          onClick={() => setUploadOpen(true)}
          className="rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-orange-400"
        >
          + Subir KML/KMZ
        </button>
      </AppHeader>

      {/* Stats bar */}
      <GeoStatsBar stats={stats} />

      {/* Body: list | map | panel  (en celular la lista y el panel son overlays) */}
      <div className="relative flex min-h-0 flex-1">
        {/* Fondo oscuro al abrir la lista en celular */}
        {listaAbierta && (
          <button
            aria-label="Cerrar lista"
            onClick={() => setListaAbierta(false)}
            className="absolute inset-0 z-20 bg-black/30 md:hidden"
          />
        )}

        <aside
          className={`absolute inset-y-0 left-0 z-30 flex w-80 max-w-[85%] shrink-0 flex-col border-r border-white/10 bg-surface transition-transform md:static md:z-auto md:max-w-none md:translate-x-0 ${
            listaAbierta ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="border-b border-white/10 p-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar parcela o productor…"
              className="w-full rounded-lg border border-white/10 bg-black px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-orange-400"
            />
          </div>
          <ParcelaList
            parcelas={filtered}
            selectedId={selectedId}
            onSelect={elegirParcela}
            shapes={shapes}
          />
        </aside>

        <main className="relative min-w-0 flex-1">
          {/* Botón para abrir la lista — solo en celular */}
          <button
            onClick={() => setListaAbierta(true)}
            className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-3 py-2 text-sm font-medium text-white backdrop-blur-md md:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
            Parcelas
          </button>
          <GeoSICMap
            parcelas={parcelas}
            polygons={polygons}
            selectedId={selectedId}
            onSelect={elegirParcela}
          />
        </main>

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

// Normaliza cada polígono a un viewBox 0-100 (sin proyección, solo para un
// glyph de identificación) preservando la relación de aspecto real, con el
// eje Y invertido porque SVG crece hacia abajo y la latitud hacia el norte.
function buildShapes(
  polygons: GeoJSON.FeatureCollection<GeoJSON.Polygon>,
): Map<string, string> {
  const shapes = new Map<string, string>()
  for (const f of polygons.features) {
    const ring = f.geometry.coordinates[0] as [number, number][] | undefined
    const id = f.properties?.parcela_id as string | undefined
    if (!id || !ring || ring.length < 3) continue

    const lons = ring.map((c) => c[0])
    const lats = ring.map((c) => c[1])
    const minLon = Math.min(...lons)
    const maxLon = Math.max(...lons)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const spanLon = maxLon - minLon || 1
    const spanLat = maxLat - minLat || 1

    const points = ring
      .map(([lon, lat]) => {
        const x = ((lon - minLon) / spanLon) * 100
        const y = (1 - (lat - minLat) / spanLat) * 100
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
    shapes.set(id, points)
  }
  return shapes
}
