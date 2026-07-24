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
    <div className="flex h-screen w-screen items-center justify-center bg-black p-6">
      <div className="max-w-md rounded-2xl bg-surface p-8 text-center">
        <p className="mx-auto mb-4 inline-block rounded-full border border-amber-500/30 px-4 py-1.5 font-mono text-[11px] tracking-wide text-amber-400">
          Sin organización
        </p>
        <h1 className="mb-2 text-lg font-normal text-cream">
          Tu cuenta no tiene organización asignada
        </h1>
        <p className="mb-6 text-sm text-gray-400">
          Iniciaste sesión correctamente, pero no encontramos una membresía en
          ninguna organización. Ejecuta el bloque de bootstrap del SQL{' '}
          <code className="rounded bg-surface2 px-1 text-gray-300">
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
  )
}
