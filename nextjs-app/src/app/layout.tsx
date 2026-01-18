import type { Metadata, Viewport } from 'next'
import { Urbanist, Bebas_Neue } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import ClientLayout from '@/components/ClientLayout'
import DevToolsProtection from '@/components/DevToolsProtection'

import { supabase } from '@/lib/supabase'

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
  let description = 'Redefiniendo el Streetwear. Tu estilo, sin límites.'
  let shareDescription = 'Redefiniendo el Streetwear. Tu estilo, sin límites. Descubrí los últimos drops y armá tu fit.'

  try {
    const { data } = await supabase
      .from('configuracion')
      .select('clave, valor')
      .in('clave', ['nombre_tienda', 'lema_tienda', 'share_description'])
    
    if (data) {
      const config = data.reduce((acc: any, item: any) => {
        acc[item.clave] = item.valor
        return acc
      }, {})

      if (config.nombre_tienda) title = config.nombre_tienda
      if (config.lema_tienda) description = config.lema_tienda
      if (config.share_description) shareDescription = config.share_description
    }
  } catch (e) {
    console.error('Error fetching metadata:', e)
  }

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Streetwear & Drops`,
      description: shareDescription,
      type: 'website',
      locale: 'es_AR',
      siteName: title,
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
          position="bottom-right"
          containerStyle={{
            bottom: 80,
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
