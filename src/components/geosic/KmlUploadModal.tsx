'use client'

// Modal to upload a KML/KMZ for a chosen parcela. Posts to the upload API
// which parses the geometry and persists it via PostGIS.
import { useState } from 'react'
import type { ParcelaGeoRow } from '@/lib/types'

interface Props {
  parcelas: ParcelaGeoRow[]
  onClose: () => void
  onUploaded: () => void
}

export default function KmlUploadModal({
  parcelas,
  onClose,
  onUploaded,
}: Props) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-surface">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-base font-normal text-cream">
            Subir polígono (KML / KMZ)
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-500 hover:bg-surface2 hover:text-cream"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <label className="mb-1 block font-mono text-[11px] tracking-wide text-gray-500">
              Parcela
            </label>
            {seleccionada && (
              <div className="mb-2 flex items-center justify-between rounded-lg border border-orange-500/40 bg-orange-500/10 px-2.5 py-1.5 text-sm">
                <span className="min-w-0 truncate text-cream">
                  <span className="font-medium">{seleccionada.nombre || seleccionada.codigo_parcela}</span>
                  <span className="text-gray-400"> · {seleccionada.productor_nombre}</span>
                </span>
                <button
                  onClick={() => setParcelaId('')}
                  className="ml-2 shrink-0 text-xs text-gray-500 hover:text-red-400"
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
                  className="mb-2 w-full rounded-lg border border-white/10 bg-black px-3.5 py-2.5 text-sm text-cream outline-none transition-colors focus:border-orange-400"
                  autoFocus
                />
                <div className="max-h-56 overflow-y-auto rounded-xl border border-white/10">
                  {opciones.length === 0 ? (
                    <p className="p-3 text-center text-sm text-gray-500">Sin coincidencias.</p>
                  ) : (
                    opciones.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setParcelaId(p.id)}
                        className="flex w-full items-center justify-between gap-2 border-b border-white/5 px-2.5 py-2 text-left text-sm hover:bg-surface2"
                      >
                        <span className="min-w-0 truncate">
                          <span className="font-medium text-cream">{p.nombre || p.codigo_parcela}</span>
                          <span className="block truncate text-xs text-gray-500">{p.productor_nombre}</span>
                        </span>
                        <span className="shrink-0 text-xs text-gray-500">
                          {p.poligono_id ? '● con polígono' : ''}
                        </span>
                      </button>
                    ))
                  )}
                </div>
                {filtradas.length > opciones.length && (
                  <p className="mt-1 text-xs text-gray-500">
                    Mostrando {opciones.length} de {filtradas.length}. Escribe para acotar.
                  </p>
                )}
              </>
            )}
          </div>

          <div>
            <label className="mb-1 block font-mono text-[11px] tracking-wide text-gray-500">
              Archivo
            </label>
            <input
              type="file"
              accept=".kml,.kmz,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-400 file:mr-3 file:rounded-full file:border-0 file:bg-orange-500/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-orange-400 hover:file:bg-orange-500/20"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 p-2 text-sm text-red-400">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-full px-3 py-1.5 text-sm text-gray-400 hover:bg-surface2 hover:text-cream"
          >
            Cancelar
          </button>
          <button
            disabled={busy}
            onClick={submit}
            className="rounded-full bg-orange-500 px-4 py-1.5 text-sm font-medium text-black transition hover:bg-orange-400 disabled:opacity-50"
          >
            {busy ? 'Procesando…' : 'Subir y procesar'}
          </button>
        </div>
      </div>
    </div>
  )
}
