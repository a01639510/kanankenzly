'use client'

// Mini-mapa REAL (no una imagen decorativa) para la tarjeta "Cobertura
// geográfica" del panel: los polígonos reales de la organización, encuadrados
// automáticamente, con controles de zoom/recentrar propios en cristal —
// mismo patrón que GeoSICMap/SateliteMap, pero sin selección/click.
import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { ESTADO_COLOR } from '@/lib/types'
import type { EstadoValidacion } from '@/lib/types'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

function colorMatchExpression(): mapboxgl.ExpressionSpecification {
  const pairs = (Object.keys(ESTADO_COLOR) as EstadoValidacion[]).flatMap(
    (estado) => [estado, ESTADO_COLOR[estado]],
  )
  return ['match', ['get', 'estado_validacion'], ...pairs, '#64748b'] as unknown as mapboxgl.ExpressionSpecification
}

export default function CoberturaMiniMapa({
  polygons,
}: {
  polygons: GeoJSON.FeatureCollection<GeoJSON.Polygon>
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    let rafId = 0
    function init() {
      const container = containerRef.current
      if (mapRef.current || !container) return
      if (container.clientHeight === 0 || container.clientWidth === 0) {
        rafId = requestAnimationFrame(init)
        return
      }

      const map = new mapboxgl.Map({
        container,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-92.5, 15.3], // fallback; se ajusta a los datos abajo
        zoom: 8,
        interactive: true,
        attributionControl: false,
      })
      mapRef.current = map

      map.on('load', () => {
        map.addSource('cobertura-polygons', { type: 'geojson', data: polygons })
        map.addLayer({
          id: 'cobertura-fill',
          type: 'fill',
          source: 'cobertura-polygons',
          paint: { 'fill-color': colorMatchExpression(), 'fill-opacity': 0.5 },
        })
        map.addLayer({
          id: 'cobertura-line',
          type: 'line',
          source: 'cobertura-polygons',
          paint: { 'line-color': colorMatchExpression(), 'line-width': 1.2 },
        })

        const bounds = new mapboxgl.LngLatBounds()
        let has = false
        for (const f of polygons.features) {
          for (const ring of f.geometry.coordinates) {
            for (const coord of ring) {
              bounds.extend(coord as [number, number])
              has = true
            }
          }
        }
        if (has) map.fitBounds(bounds, { padding: 24, maxZoom: 13, duration: 0 })
        map.resize()
      })
    }
    init()
    return () => {
      cancelAnimationFrame(rafId)
      mapRef.current?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function zoomBy(delta: number) {
    const map = mapRef.current
    if (!map) return
    map.zoomTo(map.getZoom() + delta, { duration: 200 })
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute right-1.5 top-1.5 z-10 flex flex-col gap-0.5 rounded-full border border-white/10 bg-black/50 p-1 backdrop-blur-md">
        <button
          onClick={() => zoomBy(1)}
          aria-label="Acercar"
          className="flex h-6 w-6 items-center justify-center rounded-full text-white transition hover:bg-white/10"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <button
          onClick={() => zoomBy(-1)}
          aria-label="Alejar"
          className="flex h-6 w-6 items-center justify-center rounded-full text-white transition hover:bg-white/10"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14" /></svg>
        </button>
      </div>
    </div>
  )
}
