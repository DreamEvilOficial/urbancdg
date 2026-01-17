import type { Metadata, Viewport } from 'next'
import { Urbanist, Bebas_Neue } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import ClientLayout from '@/components/ClientLayout'
import DevToolsProtection from '@/components/DevToolsProtection'

import db from '@/lib/db'

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

export async function generateMetadata(): Promise<Metadata> {
  let title = 'URBAN'
  let description = 'Tu estilo, sin límites.'
  let shareDescription = 'URBAN: Tu estilo, sin límites. Descubrí los últimos drops y armá tu fit.'
  let logoUrl = '/og-image.jpg'

  try {
    const data = await db.all('SELECT clave, valor FROM configuracion WHERE clave IN (?, ?, ?, ?)', 
      ['nombre_tienda', 'lema_tienda', 'share_description', 'logo_url']
    )
    
    if (data && data.length > 0) {
      const config: any = {}
      data.forEach((item: any) => {
        try {
          config[item.clave] = JSON.parse(item.valor)
        } catch {
          config[item.clave] = item.valor
        }
      })

      if (config.nombre_tienda) title = config.nombre_tienda
      if (config.lema_tienda) description = config.lema_tienda
      if (config.share_description) shareDescription = config.share_description
      if (config.logo_url) {
        if (config.logo_url.startsWith('http')) {
          logoUrl = config.logo_url
        } else {
          logoUrl = `https://urbancdg.vercel.app${config.logo_url.startsWith('/') ? '' : '/'}${config.logo_url}`
        }
      }
    }
  } catch (e) {
    console.error('Error fetching metadata:', e)
  }

  return {
    metadataBase: new URL('https://urbancdg.vercel.app'),
    title: {
      default: title,
      template: `%s | ${title}`
    },
    description,
    openGraph: {
      title: title,
      description: shareDescription,
      type: 'website',
      locale: 'es_AR',
      siteName: title,
      images: [
        {
          url: logoUrl,
          width: 1200,
          height: 630,
          alt: title,
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: shareDescription,
      images: [logoUrl],
    },
    icons: {
      icon: '/favicon.svg',
    },
  }
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
        <DevToolsProtection />
        <Toaster 
          position="top-right"
          containerStyle={{
            top: 160,
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
        {/* Protección de DevTools (sin bloquear selección de texto) */}
        {process.env.NODE_ENV === 'production' && <DevToolsProtection />}
      </body>
    </html>
  )
}
