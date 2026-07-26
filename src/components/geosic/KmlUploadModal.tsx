'use client'

// Modal to upload a KML/KMZ for a chosen parcela. Posts to the upload API
// which parses the geometry and persists it via PostGIS.
import { useState } from 'react'
import type { ParcelaGeoRow } from '@/lib/types'

interface Props {
  parcelas: ParcelaGeoRow[]
  onClose: () => void
  onUploaded: () => void
  onDibujar: (parcelaId: string) => void
}

export default function KmlUploadModal({
  parcelas,
  onClose,
  onUploaded,
  onDibujar,
}: Props) {
  const [modo, setModo] = useState<'archivo' | 'dibujar'>('archivo')
  const [parcelaId, setParcelaId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const filtradas = parcelas.filter((p) => {
    if (!q) return true
    return (
      p.codigo_parcela.toLowerCase().includes(q) ||
      (p.nombre ?? '').toLowerCase().includes(q) ||
      p.productor_nombre.toLowerCase().includes(q)
    )
  })
  // Se muestran hasta 200 para no colgar el DOM; el buscador acota el resto.
  const opciones = filtradas.slice(0, 200)
  const seleccionada = parcelas.find((p) => p.id === parcelaId)

  async function submit() {
    if (!parcelaId) {
      setError('Selecciona una parcela')
      return
    }
    if (!file) {
      setError('Selecciona un archivo KML o KMZ')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('parcela_id', parcelaId)
      const res = await fetch('/api/geosic/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Error ${res.status}`)
      }
      onUploaded()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al subir')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#1C1E24] to-[#16181D]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-base font-medium text-white">Agregar polígono</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-silver hover:bg-white/5 hover:text-white"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-1 px-4 pt-3">
          <button
            onClick={() => setModo('archivo')}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              modo === 'archivo' ? 'bg-white/10 text-white' : 'text-silver hover:text-white'
            }`}
          >
            Subir archivo
          </button>
          <button
            onClick={() => setModo('dibujar')}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              modo === 'dibujar' ? 'bg-white/10 text-white' : 'text-silver hover:text-white'
            }`}
          >
            Dibujar en el mapa
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <label className="mb-1 block font-mono text-[11px] tracking-wide text-silver">
              Parcela
            </label>
            {seleccionada && (
              <div className="mb-2 flex items-center justify-between rounded-lg border border-orange-500/40 bg-orange-500/10 px-2.5 py-1.5 text-sm">
                <span className="min-w-0 truncate text-white">
                  <span className="font-medium">{seleccionada.nombre || seleccionada.codigo_parcela}</span>
                  <span className="text-silver"> · {seleccionada.productor_nombre}</span>
                </span>
                <button
                  onClick={() => setParcelaId('')}
                  className="ml-2 shrink-0 text-xs text-silver hover:text-red-400"
                >
                  cambiar
                </button>
              </div>
            )}
            {!seleccionada && (
              <>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por parcela, código o productor…"
                  className="mb-2 w-full rounded-lg border border-white/10 bg-black px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-orange-400"
                  autoFocus
                />
                <div className="max-h-56 overflow-y-auto rounded-xl border border-white/10">
                  {opciones.length === 0 ? (
                    <p className="p-3 text-center text-sm text-silver">Sin coincidencias.</p>
                  ) : (
                    opciones.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setParcelaId(p.id)}
                        className="flex w-full items-center justify-between gap-2 border-b border-white/5 px-2.5 py-2 text-left text-sm hover:bg-white/5"
                      >
                        <span className="min-w-0 truncate">
                          <span className="font-medium text-white">{p.nombre || p.codigo_parcela}</span>
                          <span className="block truncate text-xs text-silver">{p.productor_nombre}</span>
                        </span>
                        <span className="shrink-0 text-xs text-silver">
                          {p.poligono_id ? '● con polígono' : ''}
                        </span>
                      </button>
                    ))
                  )}
                </div>
                {filtradas.length > opciones.length && (
                  <p className="mt-1 text-xs text-silver">
                    Mostrando {opciones.length} de {filtradas.length}. Escribe para acotar.
                  </p>
                )}
              </>
            )}
          </div>

          {modo === 'archivo' ? (
            <div>
              <label className="mb-1 block font-mono text-[11px] tracking-wide text-silver">
                Archivo
              </label>
              <input
                type="file"
                accept=".kml,.kmz,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-silver file:mr-3 file:rounded-full file:border-0 file:bg-orange-500/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-orange-400 hover:file:bg-orange-500/20"
              />
            </div>
          ) : (
            <p className="rounded-lg bg-white/5 p-3 text-sm text-silver">
              Elige la parcela y toca &quot;Dibujar en el mapa&quot;. El modal se cierra y podrás
              marcar los vértices del polígono directamente sobre la imagen satelital.
            </p>
          )}

          {error && (
            <p className="rounded-lg bg-red-500/10 p-2 text-sm text-red-400">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-full px-3 py-1.5 text-sm text-silver hover:bg-white/5 hover:text-white"
          >
            Cancelar
          </button>
          {modo === 'archivo' ? (
            <button
              disabled={busy}
              onClick={submit}
              className="rounded-full bg-orange-500 px-4 py-1.5 text-sm font-medium text-black transition hover:bg-orange-400 disabled:opacity-50"
            >
              {busy ? 'Procesando…' : 'Subir y procesar'}
            </button>
          ) : (
            <button
              disabled={!parcelaId}
              onClick={() => onDibujar(parcelaId)}
              className="rounded-full bg-orange-500 px-4 py-1.5 text-sm font-medium text-black transition hover:bg-orange-400 disabled:opacity-50"
            >
              Dibujar en el mapa →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
