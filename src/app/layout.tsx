import type { Metadata, Viewport } from 'next'
import { Montserrat } from 'next/font/google'
import './globals.css'

// Montserrat: tipografía base de toda la app — geométrica, data-dense, encaja
// con el look "command center" (nav, tarjetas bento, cifras de KPI).
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-montserrat',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Kenzly EUDR',
  description:
    'Trazabilidad geográfica y diligencia debida EUDR para organizaciones agrícolas: parcelas, monitoreo satelital e inspección en campo.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kenzly EUDR',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={montserrat.variable}>
      <body className="font-sans antialiased">
        {/* Mesh gradient fijo detrás de toda la app — los shells de cada
            página van sin fondo opaco propio para que esto se vea a través. */}
        <div aria-hidden="true" className="mesh-bg fixed inset-0 -z-10" />
        {children}
      </body>
    </html>
  )
}
