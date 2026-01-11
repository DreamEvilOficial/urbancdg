import type { Metadata, Viewport } from 'next'
import { Urbanist, Bebas_Neue } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import ClientLayout from '@/components/ClientLayout'

const urbanist = Urbanist({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
})

const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'URBAN',
  description: 'Redefiniendo el Streetwear. Tu estilo, sin límites.',
  openGraph: {
    title: 'URBAN | Streetwear & Drops',
    description: 'Redefiniendo el Streetwear. Tu estilo, sin límites. Descubrí los últimos drops y armá tu fit.',
    type: 'website',
    locale: 'es_AR',
    siteName: 'URBAN CDG',
  },
  icons: {
    icon: '/favicon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning className="h-full">
      <body className={`${urbanist.variable} ${bebasNeue.variable} h-full font-sans antialiased`}>
        <ClientLayout>
          {children}
        </ClientLayout>
        <Toaster 
          position="top-right"
          containerStyle={{
            top: 80,
            right: 20,
            zIndex: 9999999,
          }}
          toastOptions={{
            style: {
              background: '#06070c',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '12px 16px',
              zIndex: 999999,
            },
            success: {
              iconTheme: {
                primary: '#B7FF2A',
                secondary: '#000',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
