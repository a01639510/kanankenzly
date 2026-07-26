'use client'

// Shown when the user is authenticated but has no membership row (so RLS would
// hide all data). Breaks the /login <-> /geosic redirect loop and lets them
// sign out to try another account.
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NoMembership() {
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center p-6">
      <div className="relative max-w-md overflow-hidden rounded-[24px] border border-white/10 bg-black/60 p-8 text-center backdrop-blur-2xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-0 h-24 bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.1),_transparent_70%)]"
        />
        <div className="relative z-10">
          <p className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 font-mono text-[11px] tracking-wide text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Sin organización
          </p>
          <h1 className="mb-2 text-lg font-medium text-white">
            Tu cuenta no tiene organización asignada
          </h1>
          <p className="mb-6 text-sm text-silver">
            Iniciaste sesión correctamente, pero no encontramos una membresía en
            ninguna organización. Ejecuta el bloque de bootstrap del SQL{' '}
            <code className="rounded bg-white/5 px-1 text-white/80">
              0002_storage_and_bootstrap.sql
            </code>{' '}
            o pide a un administrador que te agregue.
          </p>
          <button
            onClick={signOut}
            className="rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-black hover:bg-orange-400"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
