'use client'

// Mapbox GL JS map (used directly, not react-map-gl, for full layer control).
// Renders two sources:
//   1. polygons  -> fill + outline, colored by estado_validacion
//   2. pins      -> circle markers for parcelas WITHOUT a polygon (centroide null)
// Selection is driven from the parent via `selectedId`; clicks call onSelect.
import { useEffect, useRef, useCallback, useState } from 'react'
import mapboxgl from 'mapbox-gl'
// NOTE: mapbox-gl CSS is imported globally in app/globals.css (the in-component
// import was not applied reliably, leaving the canvas at its 150px default).
import type { ParcelaGeoRow, EstadoValidacion } from '@/lib/types'
import { ESTADO_COLOR, ESTADO_LABEL } from '@/lib/types'
import { CENTRO_DEFAULT } from '@/lib/geo/centro'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

// Mapbox `match` expression mapping estado_validacion -> color.
// Built from the single source of truth in types.ts so colors never drift.
function colorMatchExpression(): mapboxgl.ExpressionSpecification {
  const pairs = (Object.keys(ESTADO_COLOR) as EstadoValidacion[]).flatMap(
    (estado) => [estado, ESTADO_COLOR[estado]],
  )
  return [
    'match',
    ['get', 'estado_validacion'],
    ...pairs,
    '#64748b', // fallback gris
  ] as unknown as mapboxgl.ExpressionSpecification
}

interface Props {
  parcelas: ParcelaGeoRow[]
  polygons: GeoJSON.FeatureCollection<GeoJSON.Polygon>
  selectedId: string | null
  onSelect: (id: string) => void
  // Modo "dibujar polígono a mano" — ver GeoSICShell/KmlUploadModal.
  dibujoActivo?: boolean
  onPoligonoTerminado?: (polygon: GeoJSON.Polygon) => void
  onDibujoCancelado?: () => void
}

// Feature collection de apoyo visual para el dibujo en curso: los vértices
// como puntos, la línea abierta entre ellos, y — desde el 3er punto — un
// preview del polígono cerrado. Los 3 layers filtran por geometry-type sobre
// la misma fuente.
function buildDibujoFeatures(puntos: [number, number][]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = puntos.map((p) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: p },
    properties: {},
  }))
  if (puntos.length >= 2) {
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: puntos },
      properties: {},
    })
  }
  if (puntos.length >= 3) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[...puntos, puntos[0]]] },
      properties: {},
    })
  }
  return { type: 'FeatureCollection', features }
}

export default function GeoSICMap({
  parcelas,
  polygons,
  selectedId,
  onSelect,
  dibujoActivo = false,
  onPoligonoTerminado,
  onDibujoCancelado,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const loadedRef = useRef(false)
  const [legendOpen, setLegendOpen] = useState(true)
  const [puntos, setPuntos] = useState<[number, number][]>([])
  // Keep latest onSelect without re-binding map event listeners.
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  // El click handler de selección (ligado una sola vez, al cargar el mapa)
  // necesita saber en tiempo real si estamos dibujando, sin re-bindearse.
  const dibujoActivoRef = useRef(dibujoActivo)
  dibujoActivoRef.current = dibujoActivo

  // Build a point FeatureCollection for parcelas that have a centroid but
  // we still render as pins too (so a polygon's centroid shows a clickable dot).
  const buildPins = useCallback(
    (): GeoJSON.FeatureCollection<GeoJSON.Point> => ({
      type: 'FeatureCollection',
      features: parcelas
        .filter((p) => p.centroide_lat !== null && p.centroide_lng !== null)
        .map((p) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [p.centroide_lng!, p.centroide_lat!],
          },
          properties: {
            parcela_id: p.id,
            estado_validacion: p.estado_validacion,
          },
        })),
    }),
    [parcelas],
  )

  // --- Initialize the map once ---
  useEffect(() => {
    let rafId = 0
    let ro: ResizeObserver | null = null

    // Create the map ONLY when the container has a real height. In flex/absolute
    // layouts the container can still be 0px on the first frame; initializing
    // then leaves Mapbox measuring 0 and never painting. We retry on the next
    // animation frame until the layout has settled — this kills the race.
    function init() {
      const container = containerRef.current
      if (mapRef.current || !container) return
      if (container.clientHeight === 0 || container.clientWidth === 0) {
        rafId = requestAnimationFrame(init)
        return
      }

      const map = new mapboxgl.Map({
        container,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: CENTRO_DEFAULT,
        zoom: 9,
      })
      mapRef.current = map
      // Sin NavigationControl nativo: usamos los botones de cristal propios
      // (más abajo en el JSX) para que combinen con el resto del HUD.
      map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-right')

    // Surface any Mapbox error in the browser console (token, style, tiles…).
    map.on('error', (e) => {
      console.error('[mapbox] error:', e.error?.message ?? e)
    })

    // If the container was measured at 0px during init (flex/absolute layouts),
    // a resize once the map is ready forces a correct render.
    map.on('load', () => map.resize())

    map.on('load', () => {
      // Polygon source
      map.addSource('parcela-polygons', { type: 'geojson', data: polygons })
      map.addLayer({
        id: 'polygons-fill',
        type: 'fill',
        source: 'parcela-polygons',
        paint: {
          'fill-color': colorMatchExpression(),
          'fill-opacity': 0.4,
        },
      })
      map.addLayer({
        id: 'polygons-line',
        type: 'line',
        source: 'parcela-polygons',
        paint: {
          'line-color': colorMatchExpression(),
          'line-width': [
            'case',
            ['==', ['get', 'parcela_id'], selectedId ?? ''],
            4,
            1.5,
          ],
        },
      })

      // Pin source (centroids)
      map.addSource('parcela-pins', { type: 'geojson', data: buildPins() })
      map.addLayer({
        id: 'pins',
        type: 'circle',
        source: 'parcela-pins',
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'parcela_id'], selectedId ?? ''],
            9,
            6,
          ],
          'circle-color': colorMatchExpression(),
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })

      // Fuente + capas del dibujo manual (vacías hasta que se activa el modo).
      map.addSource('dibujo-temp', { type: 'geojson', data: buildDibujoFeatures([]) })
      map.addLayer({
        id: 'dibujo-fill',
        type: 'fill',
        source: 'dibujo-temp',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': '#F8921D', 'fill-opacity': 0.15 },
      })
      map.addLayer({
        id: 'dibujo-line',
        type: 'line',
        source: 'dibujo-temp',
        filter: ['any', ['==', ['geometry-type'], 'LineString'], ['==', ['geometry-type'], 'Polygon']],
        paint: { 'line-color': '#F8921D', 'line-width': 2, 'line-dasharray': [2, 1.2] },
      })
      map.addLayer({
        id: 'dibujo-puntos',
        type: 'circle',
        source: 'dibujo-temp',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: { 'circle-radius': 5, 'circle-color': '#ffffff', 'circle-stroke-width': 2, 'circle-stroke-color': '#F8921D' },
      })

      // Click handlers (use ref so we never stale-close over onSelect). En
      // modo dibujo NO seleccionamos parcela — el clic agrega un vértice
      // (ver el efecto de más abajo).
      const handleClick = (
        e: mapboxgl.MapMouseEvent & { features?: mapboxgl.GeoJSONFeature[] },
      ) => {
        if (dibujoActivoRef.current) return
        const id = e.features?.[0]?.properties?.parcela_id as string | undefined
        if (id) onSelectRef.current(id)
      }
      map.on('click', 'polygons-fill', handleClick)
      map.on('click', 'pins', handleClick)

      for (const layer of ['polygons-fill', 'pins']) {
        map.on('mouseenter', layer, () => {
          map.getCanvas().style.cursor = 'pointer'
        })
        map.on('mouseleave', layer, () => {
          map.getCanvas().style.cursor = ''
        })
      }

      loadedRef.current = true
      fitToData(map, polygons, buildPins())
    })

      // Keep the canvas in sync when the layout changes (panel open/close).
      ro = new ResizeObserver(() => map.resize())
      ro.observe(container)
    }

    init()

    return () => {
      cancelAnimationFrame(rafId)
      ro?.disconnect()
      mapRef.current?.remove()
      mapRef.current = null
      loadedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Update sources when data changes (after refresh) ---
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    ;(map.getSource('parcela-polygons') as mapboxgl.GeoJSONSource | undefined)?.setData(
      polygons,
    )
    ;(map.getSource('parcela-pins') as mapboxgl.GeoJSONSource | undefined)?.setData(
      buildPins(),
    )
  }, [polygons, buildPins])

  // --- Highlight + fly to the selected parcela ---
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return

    // Re-apply width/radius expressions referencing the new selectedId.
    if (map.getLayer('polygons-line')) {
      map.setPaintProperty('polygons-line', 'line-width', [
        'case',
        ['==', ['get', 'parcela_id'], selectedId ?? ''],
        4,
        1.5,
      ])
    }
    if (map.getLayer('pins')) {
      map.setPaintProperty('pins', 'circle-radius', [
        'case',
        ['==', ['get', 'parcela_id'], selectedId ?? ''],
        9,
        6,
      ])
    }

    if (!selectedId) return
    const p = parcelas.find((x) => x.id === selectedId)
    if (p?.centroide_lat && p.centroide_lng) {
      map.flyTo({
        center: [p.centroide_lng, p.centroide_lat],
        zoom: Math.max(map.getZoom(), 14),
        duration: 800,
      })
    }
  }, [selectedId, parcelas])

  // --- Modo dibujo: reinicia los vértices cada vez que se activa/desactiva ---
  useEffect(() => {
    setPuntos([])
  }, [dibujoActivo])

  // --- Modo dibujo: un clic en el mapa agrega un vértice ---
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current || !dibujoActivo) return

    map.getCanvas().style.cursor = 'crosshair'
    const onClick = (e: mapboxgl.MapMouseEvent) => {
      setPuntos((prev) => [...prev, [e.lngLat.lng, e.lngLat.lat]])
    }
    map.on('click', onClick)
    return () => {
      map.off('click', onClick)
      map.getCanvas().style.cursor = ''
    }
  }, [dibujoActivo])

  // --- Modo dibujo: refleja los vértices en el preview del mapa ---
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    ;(map.getSource('dibujo-temp') as mapboxgl.GeoJSONSource | undefined)?.setData(
      buildDibujoFeatures(puntos),
    )
  }, [puntos])

  function finalizarDibujo() {
    if (puntos.length < 3) return
    onPoligonoTerminado?.({ type: 'Polygon', coordinates: [[...puntos, puntos[0]]] })
    setPuntos([])
  }

  function cancelarDibujo() {
    setPuntos([])
    onDibujoCancelado?.()
  }

  function zoomBy(delta: number) {
    const map = mapRef.current
    if (!map) return
    map.zoomTo(map.getZoom() + delta, { duration: 200 })
  }

  function recentrar() {
    const map = mapRef.current
    if (!map) return
    fitToData(map, polygons, buildPins())
  }

  const estados = Object.keys(ESTADO_COLOR) as EstadoValidacion[]

  return (
    <>
      <div ref={containerRef} className="absolute inset-0" />

      {!dibujoActivo && (
        <>
          {/* Controles flotantes de cristal: zoom +/- y recentrar. */}
          <div className="absolute right-3 top-3 z-10 flex flex-col gap-1 rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur-md">
            <button
              onClick={() => zoomBy(1)}
              aria-label="Acercar"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/10"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </button>
            <button
              onClick={() => zoomBy(-1)}
              aria-label="Alejar"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/10"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14" /></svg>
            </button>
            <div className="h-px bg-white/10" />
            <button
              onClick={recentrar}
              aria-label="Centrar en los datos"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/10"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3m0 12v3m9-9h-3M6 12H3" /><circle cx="12" cy="12" r="3.5" /></svg>
            </button>
          </div>

          {/* Leyenda flotante de cristal: colores de estado_validacion. */}
          <div className="absolute bottom-3 left-3 z-10 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md">
            <button
              onClick={() => setLegendOpen((o) => !o)}
              className="flex w-full items-center gap-2 px-3 py-2 font-mono text-[11px] tracking-wide text-silver"
            >
              Estados
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${legendOpen ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {legendOpen && (
              <div className="flex flex-col gap-1.5 border-t border-white/10 px-3 py-2">
                {estados.map((e) => (
                  <div key={e} className="flex items-center gap-2 text-xs text-white">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: ESTADO_COLOR[e] }} />
                    {ESTADO_LABEL[e]}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Toolbar flotante del modo dibujo: instrucción + vértices + acciones. */}
      {dibujoActivo && (
        <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center px-3">
          <div className="flex flex-wrap items-center gap-3 rounded-full border border-orange-500/30 bg-black/70 px-4 py-2 backdrop-blur-xl">
            <span className="font-mono text-[11px] tracking-wide text-silver">
              {puntos.length === 0
                ? 'Toca el mapa para marcar el primer vértice'
                : `${puntos.length} vértice${puntos.length === 1 ? '' : 's'}`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPuntos((prev) => prev.slice(0, -1))}
                disabled={puntos.length === 0}
                className="rounded-full px-3 py-1 text-xs font-medium text-white transition hover:bg-white/10 disabled:opacity-30"
              >
                Deshacer punto
              </button>
              <button
                onClick={cancelarDibujo}
                className="rounded-full px-3 py-1 text-xs font-medium text-red-400 transition hover:bg-red-500/10"
              >
                Cancelar
              </button>
              <button
                onClick={finalizarDibujo}
                disabled={puntos.length < 3}
                className="rounded-full bg-orange-500 px-3 py-1 text-xs font-medium text-black transition hover:bg-orange-400 disabled:opacity-30"
              >
                Finalizar polígono
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Fit the viewport to whatever geometry exists (polygons first, else pins).
function fitToData(
  map: mapboxgl.Map,
  polygons: GeoJSON.FeatureCollection<GeoJSON.Polygon>,
  pins: GeoJSON.FeatureCollection<GeoJSON.Point>,
) {
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
  if (!has) {
    for (const f of pins.features) {
      bounds.extend(f.geometry.coordinates as [number, number])
      has = true
    }
  }
  if (has) map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 })
}
