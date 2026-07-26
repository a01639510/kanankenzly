'use client'

// Cargador de la captura de fichas pensado para campo/offline: obtiene los
// catálogos del servidor si hay red, o del caché local (IndexedDB) si no.
// Así el inspector puede levantar fichas sin conexión, siempre que haya abierto
// la app con red al menos una vez (OfflineStatus cachea los catálogos al cargar).
import { useEffect, useState } from 'react'
import { obtenerCatalogos } from '@/lib/offline/sync'
import type { FormTemplate, ProductorLite, ParcelaLite } from '@/lib/types'
import FichaWizard, { type FichaEnEdicion } from './FichaWizard'

type Estado =
  | { fase: 'cargando' }
  | { fase: 'listo'; templates: FormTemplate[]; productores: ProductorLite[]; parcelas: ParcelaLite[]; offline: boolean }
  | { fase: 'sin_datos' }
  | { fase: 'error'; mensaje: string }

export default function FichaCaptureClient({
  fichaEdicion,
}: {
  /** Si viene, en vez de capturar una ficha nueva se reabre esta para corregir. */
  fichaEdicion?: FichaEnEdicion
} = {}) {
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' })

  async function cargar() {
    setEstado({ fase: 'cargando' })
    try {
      const cat = await obtenerCatalogos()
      if (!cat || cat.templates.length === 0) {
        setEstado({ fase: 'sin_datos' })
        return
      }
      setEstado({
        fase: 'listo',
        templates: cat.templates,
        productores: cat.productores,
        parcelas: cat.parcelas,
        offline: !navigator.onLine,
      })
    } catch (e) {
      setEstado({ fase: 'error', mensaje: e instanceof Error ? e.message : 'Error' })
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (estado.fase === 'cargando') {
    return <Centro>Cargando catálogos…</Centro>
  }

  if (estado.fase === 'sin_datos') {
    return (
      <Centro>
        <p className="mb-2 font-medium text-white">
          No hay catálogos descargados en este dispositivo.
        </p>
        <p className="mb-4 text-sm text-silver">
          Conéctate a internet una vez para descargar productores, parcelas y
          formularios; después podrás capturar fichas sin conexión.
        </p>
        <button
          onClick={cargar}
          className="rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-orange-400"
        >
          Reintentar
        </button>
      </Centro>
    )
  }

  if (estado.fase === 'error') {
    return (
      <Centro>
        <p className="mb-3 text-sm text-red-400">{estado.mensaje}</p>
        <button
          onClick={cargar}
          className="rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-orange-400"
        >
          Reintentar
        </button>
      </Centro>
    )
  }

  return (
    <>
      {estado.offline && (
        <div className="mx-auto mt-4 max-w-3xl rounded-xl bg-amber-500/10 px-4 py-2 text-sm text-amber-400">
          Estás sin conexión. La ficha se guardará en el dispositivo y se subirá
          sola cuando vuelva la señal.
        </div>
      )}
      <FichaWizard
        templates={estado.templates}
        productores={estado.productores}
        parcelas={estado.parcelas}
        fichaEdicion={fichaEdicion}
      />
    </>
  )
}

function Centro({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md p-10 text-center">{children}</div>
  )
}
