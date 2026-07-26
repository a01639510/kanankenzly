// Normaliza polígonos GeoJSON a un viewBox SVG 0-100 (sin proyección — es un
// glyph de identificación visual, no un mapa) preservando la relación de
// aspecto real, con el eje Y invertido porque SVG crece hacia abajo y la
// latitud hacia el norte. Usado por las micro-tarjetas de GeoSIC y por el
// mosaico decorativo del panel de coordinación.
export function buildShapes(
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
