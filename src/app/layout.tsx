import type { Metadata, Viewport } from 'next'
import { Almarai, Instrument_Serif } from 'next/font/google'
import './globals.css'

// Almarai: tipografía base de toda la app (nav, párrafos, botones, cifras).
// Instrument Serif itálica: acento tipográfico incrustado en titulares
// (clase utilitaria `font-serif italic`), inspirado en kananmx.netlify.app.
const almarai = Almarai({
  // Google solo cataloga Almarai bajo el subset "arabic", pero el juego de
  // glifos incluye Latin/Latin-ext (por eso funciona para español sin problema).
  subsets: ['arabic'],
  weight: ['300', '400', '700', '800'],
  variable: '--font-almarai',
  display: 'swap',
})
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['italic', 'normal'],
  variable: '--font-instrument-serif',
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
    <html lang="es" className={`${almarai.variable} ${instrumentSerif.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
