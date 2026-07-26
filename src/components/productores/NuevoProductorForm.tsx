'use client'

// Alta de productor en campo (CHESPAL): datos básicos + GPS del teléfono +
// parcelas iniciales con código automático <codigo>-<A|B|C…> (esquema SIC).
// Disponible para todos los roles: los inspectores también dan de alta.
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ParcelaAlta {
  nombre: string
  superficie_ha: string
  tipo_cultivo: 'cafe' | 'tropical'
}

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export default function NuevoProductorForm() {
  const router = useRouter()
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const [sexo, setSexo] = useState('')
  const [comunidad, setComunidad] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [anio, setAnio] = useState(String(new Date().getFullYear()))
  const [tipo, setTipo] = useState<'cafe' | 'tropical' | 'mixto'>('cafe')
  const [parcelas, setParcelas] = useState<ParcelaAlta[]>([
    { nombre: '', superficie_ha: '', tipo_cultivo: 'cafe' },
  ])

  const [gps, setGps] = useState<{ lat: number; lng: number; prec: number } | null>(null)
  const [gpsEstado, setGpsEstado] = useState<'idle' | 'buscando' | 'error'>('idle')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function capturarGps() {
    if (!('geolocation' in navigator)) {
      setGpsEstado('error')
      return
    }
    setGpsEstado('buscando')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          prec: Math.round(pos.coords.accuracy),
        })
        setGpsEstado('idle')
      },
      () => setGpsEstado('error'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  function setParcela(i: number, patch: Partial<ParcelaAlta>) {
    setParcelas((arr) => arr.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  }

  async function guardar() {
    if (!codigo.trim()) return setError('Falta el código del productor (ej. CR015093)')
    if (!nombre.trim()) return setError('Falta el nombre completo')
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/productores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: codigo.trim(),
          nombre_completo: nombre.trim(),
          sexo: sexo || null,
          comunidad: comunidad || null,
          municipio: municipio || null,
          anio_ingreso: anio ? Number(anio) : null,
          tipo_productor: tipo,
          lat: gps?.lat ?? null,
          lng: gps?.lng ?? null,
          gps_precision_m: gps?.prec ?? null,
          parcelas: parcelas
            .filter((p) => p.nombre.trim())
            .map((p) => ({
              nombre: p.nombre.trim(),
              superficie_ha: p.superficie_ha ? Number(p.superficie_ha) : null,
              tipo_cultivo: p.tipo_cultivo,
            })),
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok && res.status !== 207) throw new Error(body.error ?? `Error ${res.status}`)
      router.push(`/productores/${body.productor_id}`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
      setBusy(false)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-sm text-white outline-none transition-colors focus:border-orange-400'
  const labelCls = 'mb-1 block font-mono text-[11px] tracking-wide text-silver'

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <section className="mb-4 rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wide text-silver">
          Datos del productor
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Código *</span>
            <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="CR015093" className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>Nombre completo *</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>Sexo</span>
            <select value={sexo} onChange={(e) => setSexo(e.target.value)} className={inputCls}>
              <option value="">—</option>
              <option value="H">Hombre</option>
              <option value="M">Mujer</option>
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Tipo de productor</span>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} className={inputCls}>
              <option value="cafe">Café</option>
              <option value="tropical">Tropical</option>
              <option value="mixto">Mixto</option>
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Comunidad</span>
            <input value={comunidad} onChange={(e) => setComunidad(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>Municipio</span>
            <input value={municipio} onChange={(e) => setMunicipio(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>Año de ingreso</span>
            <input type="number" value={anio} onChange={(e) => setAnio(e.target.value)} className={inputCls} />
          </label>
        </div>

        {/* GPS */}
        <div className="mt-4 rounded-xl border border-white/10 bg-black/50 p-3 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm">
              <span className="font-medium text-white">Ubicación GPS</span>
              {gps ? (
                <span className="ml-2 tabular-nums text-silver">
                  {gps.lat}, {gps.lng} <span className="text-silver">(±{gps.prec} m)</span>
                </span>
              ) : (
                <span className="ml-2 text-silver">sin capturar</span>
              )}
            </div>
            <button
              type="button"
              onClick={capturarGps}
              disabled={gpsEstado === 'buscando'}
              className="rounded-full bg-orange-500 px-3 py-1.5 text-sm font-medium text-black transition hover:bg-orange-400 disabled:opacity-50"
            >
              {gpsEstado === 'buscando' ? 'Buscando señal…' : gps ? 'Volver a capturar' : 'Capturar GPS'}
            </button>
          </div>
          {gpsEstado === 'error' && (
            <p className="mt-2 text-xs text-red-400">
              No se pudo obtener la ubicación. Activa el GPS y da permiso de ubicación al navegador.
            </p>
          )}
        </div>
      </section>

      {/* Parcelas iniciales */}
      <section className="mb-4 rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl">
        <h2 className="mb-1 font-mono text-[11px] uppercase tracking-wide text-silver">
          Parcelas
        </h2>
        <p className="mb-3 text-xs text-silver">
          El código se genera solo: {codigo.trim() ? `${codigo.trim().toUpperCase()}-A, -B…` : 'CÓDIGO-A, -B…'}
        </p>
        <div className="space-y-2">
          {parcelas.map((p, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2 rounded-xl border border-white/10 bg-black/50 p-2 backdrop-blur-xl">
              <span className="w-14 shrink-0 pb-2 text-sm font-medium tabular-nums text-silver">
                {codigo.trim() ? `-${LETRAS[i]}` : LETRAS[i]}
              </span>
              <label className="min-w-[10rem] flex-1">
                <span className="mb-1 block text-xs text-silver">Nombre de la parcela</span>
                <input value={p.nombre} onChange={(e) => setParcela(i, { nombre: e.target.value })} className={inputCls} />
              </label>
              <label className="w-28">
                <span className="mb-1 block text-xs text-silver">Superficie (ha)</span>
                <input type="number" step="0.01" value={p.superficie_ha} onChange={(e) => setParcela(i, { superficie_ha: e.target.value })} className={inputCls} />
              </label>
              <label className="w-32">
                <span className="mb-1 block text-xs text-silver">Cultivo</span>
                <select value={p.tipo_cultivo} onChange={(e) => setParcela(i, { tipo_cultivo: e.target.value as 'cafe' | 'tropical' })} className={inputCls}>
                  <option value="cafe">Café</option>
                  <option value="tropical">Tropical</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => setParcelas((arr) => (arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr))}
                className="pb-2 text-silver transition hover:text-red-400"
                title="Quitar parcela"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setParcelas((arr) => [...arr, { nombre: '', superficie_ha: '', tipo_cultivo: 'cafe' }])}
          className="mt-2 rounded-full border border-white/10 bg-black/40 backdrop-blur-xl px-3 py-1.5 text-sm font-medium text-white transition hover:border-orange-500/40"
        >
          + Agregar parcela
        </button>
      </section>

      {error && <p className="mb-3 rounded-lg bg-red-500/10 p-2 text-sm text-red-400">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          onClick={() => router.push('/productores')}
          className="rounded-full px-4 py-2 text-sm text-silver transition hover:text-white"
        >
          Cancelar
        </button>
        <button
          disabled={busy}
          onClick={guardar}
          className="rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-orange-400 disabled:opacity-50"
        >
          {busy ? 'Guardando…' : 'Dar de alta'}
        </button>
      </div>
    </div>
  )
}
