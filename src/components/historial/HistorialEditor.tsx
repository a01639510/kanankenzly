'use client'

// Historial editor: tabla comparativa con los campos como filas y los años como
// columnas (igual que el formato real). Permite añadir/quitar años y editar cada
// celda. Guarda todo el historial de la parcela vía POST /api/historial.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  HISTORIAL_CAMPOS,
  HISTORIAL_NOTA,
  anioVacio,
  type HistorialAnio,
  type HistorialCampo,
} from '@/lib/historial'
import { enviarOEncolarHistorial } from '@/lib/offline/sync'

export default function HistorialEditor({
  parcelaId,
  parcelaLabel,
  aniosIniciales,
  onGuardado,
}: {
  parcelaId: string
  parcelaLabel: string
  aniosIniciales: HistorialAnio[]
  /** Si viene, se avisa al guardar (panel de anexos de la ficha). */
  onGuardado?: () => void
}) {
  const router = useRouter()
  const [anios, setAnios] = useState<HistorialAnio[]>(
    aniosIniciales.length > 0
      ? aniosIniciales
      : [anioVacio(new Date().getFullYear())],
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardadaOffline, setGuardadaOffline] = useState(false)

  function setCelda(idx: number, campoId: string, valor: string | number | null) {
    setAnios((arr) =>
      arr.map((a, i) =>
        i === idx ? { ...a, datos: { ...a.datos, [campoId]: valor } } : a,
      ),
    )
  }

  function setAnioNum(idx: number, anio: number) {
    setAnios((arr) => arr.map((a, i) => (i === idx ? { ...a, anio } : a)))
  }

  function addAnio() {
    const maxAnio = anios.reduce((m, a) => Math.max(m, a.anio), 0)
    setAnios((arr) => [...arr, anioVacio(maxAnio ? maxAnio + 1 : new Date().getFullYear())])
  }

  function removeAnio(idx: number) {
    setAnios((arr) => arr.filter((_, i) => i !== idx))
  }

  async function guardar() {
    // Validar años únicos.
    const set = new Set(anios.map((a) => a.anio))
    if (set.size !== anios.length) {
      setError('Hay años repetidos')
      return
    }
    setBusy(true)
    setError(null)
    try {
      // Offline-aware: con red se guarda; sin red se encola y se sube sola.
      const r = await enviarOEncolarHistorial(
        {
          parcela_id: parcelaId,
          anios: anios.map((a) => ({ anio: a.anio, datos: a.datos })),
        },
        `Historial · ${parcelaLabel}`,
      )
      if (r.online) {
        router.refresh()
      } else {
        setGuardadaOffline(true)
      }
      onGuardado?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setBusy(false)
    }
  }

  // Ordenar columnas por año ascendente para mostrar.
  const cols = anios
    .map((a, idx) => ({ a, idx }))
    .sort((x, y) => x.a.anio - y.a.anio)

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-surface p-4">
        <div>
          <Link href="/historial" className="text-xs text-gray-500 hover:text-cream">
            ← Volver
          </Link>
          <h1 className="text-lg font-normal text-cream">
            Historial de manejo
          </h1>
          <p className="text-sm text-gray-500">{parcelaLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addAnio}
            className="rounded-full border border-white/10 bg-surface px-3 py-1.5 text-sm font-medium text-cream transition hover:border-orange-500/40"
          >
            + Año
          </button>
          <Link
            href={`/historial/${parcelaId}/pdf`}
            className="rounded-full border border-white/10 bg-surface px-3 py-1.5 text-sm font-medium text-cream transition hover:border-orange-500/40"
          >
            Ver / PDF
          </Link>
          <button
            disabled={busy}
            onClick={guardar}
            className="rounded-full bg-orange-500 px-4 py-1.5 text-sm font-medium text-black transition hover:bg-orange-400 disabled:opacity-50"
          >
            {busy ? 'Guardando…' : 'Guardar historial'}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-red-500/10 p-2 text-sm text-red-400">{error}</p>
      )}
      {guardadaOffline && (
        <p className="mb-3 rounded-lg bg-amber-500/10 p-2 text-sm text-amber-400">
          Sin conexión: el historial se guardó en el dispositivo y se subirá solo
          al recuperar señal.
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-surface">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border border-white/10 bg-surface2 p-2 text-left font-mono text-[11px] uppercase tracking-wide text-gray-500">
                Manejo
              </th>
              {cols.map(({ a, idx }) => (
                <th key={idx} className="border border-white/10 bg-surface2 p-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <input
                      type="number"
                      value={a.anio}
                      onChange={(e) => setAnioNum(idx, Number(e.target.value))}
                      className="w-20 rounded border border-white/10 bg-black px-1 py-0.5 text-center text-sm text-cream outline-none focus:border-orange-400"
                    />
                    <button
                      onClick={() => removeAnio(idx)}
                      className="text-gray-500 hover:text-red-400"
                      title="Quitar año"
                    >
                      ✕
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HISTORIAL_CAMPOS.map((campo) => (
              <tr key={campo.id}>
                <td className="sticky left-0 z-10 border border-white/10 bg-surface p-2 font-medium text-gray-300">
                  {campo.label}
                </td>
                {cols.map(({ a, idx }) => (
                  <td key={idx} className="border border-white/5 p-1">
                    <Celda
                      campo={campo}
                      value={a.datos[campo.id] ?? null}
                      onChange={(v) => setCelda(idx, campo.id, v)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-500">* {HISTORIAL_NOTA}</p>
    </div>
  )
}

function Celda({
  campo,
  value,
  onChange,
}: {
  campo: HistorialCampo
  value: string | number | null
  onChange: (v: string | number | null) => void
}) {
  const cls = 'w-full min-w-[120px] rounded border border-transparent bg-transparent px-1.5 py-1 text-sm text-cream outline-none focus:border-orange-400'
  if (campo.tipo === 'enum') {
    return (
      <select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || null)} className={cls}>
        <option value="">—</option>
        {(campo.opciones ?? []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    )
  }
  if (campo.tipo === 'number') {
    return (
      <input
        type="number"
        value={value === null ? '' : (value as number)}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className={cls}
      />
    )
  }
  return (
    <input
      value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className={cls}
    />
  )
}
