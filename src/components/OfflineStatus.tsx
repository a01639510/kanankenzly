'use client'

// Indicador de conexión + cola de fichas pendientes. Vive en el header.
// Al recuperar conexión: refresca catálogos y vacía la cola automáticamente.
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  vaciarCola,
  sincronizarCatalogos,
  contarPendientes,
  listarTodosPendientes,
  type PendienteResumen,
} from '@/lib/offline/sync'

export default function OfflineStatus() {
  const router = useRouter()
  const [online, setOnline] = useState(true)
  const [pendientes, setPendientes] = useState(0)
  const [sincronizando, setSincronizando] = useState(false)
  const [verLista, setVerLista] = useState(false)
  const [lista, setLista] = useState<PendienteResumen[]>([])

  async function abrirLista() {
    if (!verLista) setLista(await listarTodosPendientes().catch(() => []))
    setVerLista((v) => !v)
  }

  const refrescarConteo = useCallback(async () => {
    try {
      setPendientes(await contarPendientes())
    } catch {
      /* IndexedDB no disponible: ignorar */
    }
  }, [])

  const sincronizar = useCallback(async () => {
    if (!navigator.onLine) return
    setSincronizando(true)
    try {
      await sincronizarCatalogos().catch(() => {})
      const { enviadas } = await vaciarCola()
      await refrescarConteo()
      if (enviadas > 0) router.refresh()
    } finally {
      setSincronizando(false)
    }
  }, [refrescarConteo, router])

  useEffect(() => {
    setOnline(navigator.onLine)
    refrescarConteo()

    const onOnline = () => {
      setOnline(true)
      sincronizar()
    }
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    // Sincroniza al cargar si hay red (refresca catálogos para uso offline).
    if (navigator.onLine) {
      sincronizar()
      // Pide al navegador que revise si hay una versión nueva del service
      // worker. Una tablet que vive días con la app abierta puede seguir
      // sirviendo la pantalla offline de un deploy viejo si nadie la fuerza.
      navigator.serviceWorker
        ?.getRegistration()
        .then((r) => r?.update())
        .catch(() => {})
    }

    // Refresca el conteo periódicamente (capturas en otra pestaña/SW).
    const t = setInterval(refrescarConteo, 15000)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      clearInterval(t)
    }
  }, [refrescarConteo, sincronizar])

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[11px] ${
          online ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
        }`}
        title={online ? 'Con conexión' : 'Sin conexión — las capturas se guardan en el dispositivo'}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-400' : 'bg-red-400'}`} />
        {online ? 'En línea' : 'Offline'}
      </span>

      {pendientes > 0 && (
        <div className="relative flex items-center gap-1">
          <button
            onClick={abrirLista}
            className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-400 hover:bg-orange-500/20"
            title="Capturas guardadas en el dispositivo, pendientes de subir. Toca para ver."
          >
            {pendientes} por subir
          </button>
          <button
            onClick={sincronizar}
            disabled={!online || sincronizando}
            className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-medium text-black hover:bg-orange-400 disabled:opacity-60"
            title="Subir ahora"
          >
            {sincronizando ? 'Subiendo…' : '↑'}
          </button>

          {verLista && (
            <div className="absolute right-0 top-full z-50 mt-2 max-h-72 w-72 overflow-y-auto rounded-xl border border-white/10 bg-black/70 p-2 backdrop-blur-xl shadow-lg">
              <p className="mb-1 px-1 font-mono text-[11px] tracking-wide text-silver">
                Pendientes de subir ({lista.length})
              </p>
              {lista.map((it, i) => (
                <div key={i} className="border-t border-white/[0.06] px-1 py-1.5 text-xs">
                  <span className="mr-1.5 rounded bg-white/5 px-1.5 py-0.5 font-medium text-silver">
                    {it.tipo}
                  </span>
                  <span className="text-white">{it.etiqueta}</span>
                  <span className="mt-0.5 block text-[10px] text-silver/70">
                    {new Date(it.creada_en).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
              ))}
              {lista.length === 0 && (
                <p className="px-1 py-2 text-xs text-silver">Nada pendiente.</p>
              )}
              {online && (
                <button
                  onClick={sincronizar}
                  disabled={sincronizando}
                  className="mt-2 w-full rounded-lg bg-orange-500 px-2 py-1.5 text-xs font-medium text-black hover:bg-orange-400 disabled:opacity-60"
                >
                  {sincronizando ? 'Subiendo…' : 'Subir todo ahora'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
