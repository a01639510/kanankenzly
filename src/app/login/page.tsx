'use client'

// Email/password login backed by Supabase Auth. On success we push to the
// `next` param (or /geosic). Session cookies are set by the SSR client so the
// middleware/server components see the authenticated user immediately.
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  // useSearchParams must live under a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') ?? '/panel'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    // Full navigation so the server re-reads the fresh session cookie.
    router.push(next)
    router.refresh()
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-graphite p-4">
      <form
        onSubmit={submit}
        className="relative w-full max-w-sm overflow-hidden rounded-[24px] border border-white/[0.08] bg-gradient-to-b from-[#1C1E24] to-[#16181D] p-8"
      >
        {/* Spotlight interno: brillo radial sutil en la parte superior de la tarjeta. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-0 h-28 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.07),_transparent_70%)]"
        />

        <div className="relative z-10 flex flex-col gap-4">
          <div className="mb-2 flex flex-col items-center gap-3 text-center">
            <span
              aria-hidden="true"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-lg font-medium text-black"
            >
              K
            </span>
            <div>
              <h1 className="text-lg font-medium text-white">Kenzly EUDR</h1>
              <p className="mt-1 text-sm text-silver">
                Trazabilidad geográfica · Diligencia debida EUDR
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="font-mono text-[11px] tracking-wide text-silver">
              Correo
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-lg border border-white/[0.08] bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-orange-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="font-mono text-[11px] tracking-wide text-silver">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="rounded-lg border border-white/[0.08] bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-orange-400"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 p-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 w-full rounded-full bg-orange-500 py-2.5 text-sm font-medium text-black transition hover:bg-orange-400 disabled:opacity-50"
          >
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
      </form>
    </div>
  )
}
