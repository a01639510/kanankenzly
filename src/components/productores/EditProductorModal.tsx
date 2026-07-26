'use client'

// Edit form for a productor's catalog fields. PATCHes /api/productores/[id].
import { useState } from 'react'
import type { Productor } from '@/lib/types'

export default function EditProductorModal({
  productor,
  onClose,
  onSaved,
}: {
  productor: Productor
  onClose: () => void
  onSaved: () => void
}) {
  const [nombre, setNombre] = useState(productor.nombre_completo)
  const [comunidad, setComunidad] = useState(productor.comunidad ?? '')
  const [municipio, setMunicipio] = useState(productor.municipio ?? '')
  const [sexo, setSexo] = useState(productor.sexo ?? '')
  const [anio, setAnio] = useState(
    productor.anio_ingreso ? String(productor.anio_ingreso) : '',
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/productores/${productor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_completo: nombre,
          comunidad,
          municipio,
          sexo,
          anio_ingreso: anio ? Number(anio) : null,
        }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b.error ?? `Error ${res.status}`)
      }
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={`Editar productor · ${productor.codigo}`} onClose={onClose}>
      <Field label="Nombre completo">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className={inputCls}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Comunidad">
          <input value={comunidad} onChange={(e) => setComunidad(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Municipio">
          <input value={municipio} onChange={(e) => setMunicipio(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Sexo">
          <input value={sexo} onChange={(e) => setSexo(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Año de ingreso">
          <input
            type="number"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      {error && <p className="rounded-lg bg-red-500/10 p-2 text-sm text-red-400">{error}</p>}

      <ModalActions busy={busy} onClose={onClose} onSave={save} />
    </Modal>
  )
}

// --- shared modal bits (kept local to avoid premature abstraction) ---
const inputCls =
  'w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-sm text-white outline-none transition-colors focus:border-orange-400'

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-base font-medium text-white">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-silver transition hover:text-white" aria-label="Cerrar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="space-y-3 p-4">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block font-mono text-[11px] tracking-wide text-silver">{label}</label>
      {children}
    </div>
  )
}

export function ModalActions({
  busy,
  onClose,
  onSave,
}: {
  busy: boolean
  onClose: () => void
  onSave: () => void
}) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <button onClick={onClose} className="rounded-full px-3 py-1.5 text-sm text-silver transition hover:text-white">
        Cancelar
      </button>
      <button
        disabled={busy}
        onClick={onSave}
        className="rounded-full bg-orange-500 px-4 py-1.5 text-sm font-medium text-black transition hover:bg-orange-400 disabled:opacity-50"
      >
        {busy ? 'Guardando…' : 'Guardar'}
      </button>
    </div>
  )
}
