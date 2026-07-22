// Centro por defecto de los mapas cuando la organización todavía no tiene
// parcelas con polígono (con parcelas, el mapa hace fit a sus límites).
//
// Se configura por tenant con NEXT_PUBLIC_MAPA_CENTRO="lng,lat" — así el
// producto no queda amarrado a la región de ningún cliente.
// Fallback: centroide aproximado de la franja cafetalera latinoamericana.
const FALLBACK: [number, number] = [-75.5, 4.6] // Eje cafetero, Colombia

export const CENTRO_DEFAULT: [number, number] = (() => {
  const raw = process.env.NEXT_PUBLIC_MAPA_CENTRO
  if (!raw) return FALLBACK
  const [lng, lat] = raw.split(',').map((v) => Number(v.trim()))
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : FALLBACK
})()
