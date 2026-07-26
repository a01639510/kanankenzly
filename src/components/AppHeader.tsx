'use client'

// Shared top bar: brand, organization name, module tabs and sign-out.
// Used by every module page so navigation is consistent.
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RolMembresia } from '@/lib/types'
import OfflineStatus from './OfflineStatus'

// soloAdmin: pestañas administrativas que NO ve el inspector/coordinador.
// Hoy ningún módulo la usa; el mecanismo queda para los que vengan.
const TABS: { href: string; label: string; soloAdmin?: boolean }[] = [
  { href: '/panel', label: 'Panel' },
  { href: '/geosic', label: 'GeoSIC' },
  { href: '/satelite', label: 'Satélite' },
  { href: '/productores', label: 'Productores' },
  { href: '/fichas', label: 'Fichas' },
  { href: '/bitacora', label: 'Bitácoras' },
  { href: '/historial', label: 'Historial' },
]

export default function AppHeader({
  orgNombre,
  rol,
  children,
}: {
  orgNombre: string
  rol?: RolMembresia
  children?: React.ReactNode // slot for module-specific actions (e.g. upload button)
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  // El admin ve todas las pestañas; el resto (coordinador/inspector/solo_lectura)
  // solo el set del SIC (sin los módulos administrativos).
  const tabs = TABS.filter((t) => !t.soloAdmin || rol === 'admin')

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const esActiva = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <header className="relative border-b border-white/[0.08] bg-graphite">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {/* La marca nunca se comprime ni se parte en dos líneas.
              Marca del producto (neutral); el cliente se identifica por orgNombre. */}
          <div className="flex shrink-0 items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-medium text-black"
            >
              K
            </span>
            <div className="leading-tight">
              <p className="whitespace-nowrap text-sm font-medium text-white">Kenzly EUDR</p>
              <p className="hidden max-w-[10rem] truncate font-mono text-[11px] text-silver lg:block">{orgNombre}</p>
            </div>
          </div>

          {/* Nav tipo píldora flotante: track de cristal, tab activo en pastilla
              sólida de alto contraste (fondo oscuro + texto blanco). */}
          <nav className="ml-2 hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto rounded-full border border-white/10 bg-white/[0.03] p-1 backdrop-blur-md md:flex [scrollbar-width:thin]">
            {tabs.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition ${
                  esActiva(t.href)
                    ? 'border border-white/10 bg-black text-white'
                    : 'text-silver hover:text-white'
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <OfflineStatus />
          </div>
          {children}
          <button
            onClick={signOut}
            className="hidden rounded-full px-2.5 py-1.5 text-sm text-silver transition hover:text-white md:block"
          >
            Salir
          </button>
          {/* Botón de menú — solo en celular */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-full p-2 text-silver transition hover:text-white md:hidden"
            aria-label="Menú"
            aria-expanded={menuOpen}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Menú desplegable en celular */}
      {menuOpen && (
        <nav className="border-t border-white/[0.08] bg-graphite px-2 pb-2 pt-1 md:hidden">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              onClick={() => setMenuOpen(false)}
              className={`block rounded-lg px-3 py-2.5 text-sm transition ${
                esActiva(t.href)
                  ? 'border border-white/10 bg-black text-white'
                  : 'text-silver hover:text-white'
              }`}
            >
              {t.label}
            </Link>
          ))}
          <div className="mt-1 flex items-center justify-between border-t border-white/[0.08] px-3 pt-2">
            <OfflineStatus />
            <button onClick={signOut} className="text-sm text-silver">
              Salir
            </button>
          </div>
        </nav>
      )}
    </header>
  )
}
