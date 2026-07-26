// POST /api/geosic/upload
// Recibe un multipart form con parcela_id + UNA de estas dos fuentes de
// geometría:
//   - file    -> KML/KMZ subido, se parsea y el archivo original se guarda.
//   - geojson -> polígono dibujado a mano en el mapa (GeoSICMap "Dibujar
//                polígono"), ya viene como GeoJSON.Polygon serializado.
// En ambos casos el resultado se persiste igual: upsert_parcela_poligono
// (PostGIS) + el trigger geo_recompute() deriva área/perímetro/estado.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { parseKmlOrKmz } from '@/lib/kml'

function esPoligonoValido(v: unknown): v is GeoJSON.Polygon {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as { type?: unknown }).type === 'Polygon' &&
    Array.isArray((v as { coordinates?: unknown }).coordinates)
  )
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const form = await request.formData()
  const file = form.get('file')
  const geojsonRaw = form.get('geojson')
  const parcelaId = form.get('parcela_id')

  if (typeof parcelaId !== 'string' || !parcelaId) {
    return NextResponse.json({ error: 'Falta parcela_id' }, { status: 400 })
  }

  const supabase = await createClient()

  let polygon: GeoJSON.Polygon
  let archivoUrl: string | null = null
  let esKmz = false
  let metodo: 'google_earth' | 'otro' = 'google_earth'

  if (file instanceof File) {
    // --- Fuente: archivo KML/KMZ subido ---
    const bytes = new Uint8Array(await file.arrayBuffer())
    try {
      polygon = parseKmlOrKmz(bytes, file.name).polygon
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'KML inválido' },
        { status: 422 },
      )
    }

    esKmz = file.name.toLowerCase().endsWith('.kmz')
    const ext = esKmz ? 'kmz' : 'kml'
    const path = `${session.orgSlug}/${parcelaId}/${Date.now()}.${ext}`

    const { error: storageError } = await supabase.storage
      .from('geosic')
      .upload(path, bytes, {
        contentType: esKmz
          ? 'application/vnd.google-earth.kmz'
          : 'application/vnd.google-earth.kml+xml',
        upsert: false,
      })

    // A missing bucket shouldn't block the geometry — warn but continue.
    if (storageError) {
      console.warn('[upload] storage falló (continuo sin archivo):', storageError.message)
    } else {
      const { data: pub } = supabase.storage.from('geosic').getPublicUrl(path)
      archivoUrl = pub.publicUrl
    }
  } else if (typeof geojsonRaw === 'string') {
    // --- Fuente: polígono dibujado a mano en el mapa ---
    let parsed: unknown
    try {
      parsed = JSON.parse(geojsonRaw)
    } catch {
      return NextResponse.json({ error: 'Polígono dibujado inválido (JSON)' }, { status: 422 })
    }
    if (!esPoligonoValido(parsed)) {
      return NextResponse.json({ error: 'El polígono dibujado no tiene el formato esperado' }, { status: 422 })
    }
    polygon = parsed
    metodo = 'otro' // honesto: no vino de Google Earth, se dibujó a mano
  } else {
    return NextResponse.json(
      { error: 'Falta el archivo o el polígono dibujado' },
      { status: 400 },
    )
  }

  // --- Persist geometry through the RPC (RLS-enforced) ---
  const { data, error } = await supabase.rpc('upsert_parcela_poligono', {
    p_parcela_id: parcelaId,
    p_geojson: polygon,
    p_archivo_url: archivoUrl,
    p_es_kmz: esKmz,
    p_metodo: metodo,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, poligono: data })
}
