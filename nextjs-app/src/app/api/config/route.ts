import { NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET() {
  const defaultConfig = {
    nombre_tienda: 'URBAN',
    logo_url: '/logo.svg',
    favicon_url: '/favicon.svg',
    anuncio_1: '',
    anuncio_2: '',
    anuncio_3: '',
    banner_urls: [
      {
        "url": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=600&fit=crop",
        "link": "/productos"
      },
      {
        "url": "https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200&h=600&fit=crop", 
        "link": "/ofertas"
      }
    ],
    hero_banner_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=600&fit=crop',
    mercadopago_public_key: 'TEST-ejemplo',
    envio_gratis_umbral: 50000,
    envio_gratis_forzado: false,
    music_tracks: []
  }

  try {
    const rows = await db.all('SELECT clave, valor FROM configuracion') as any[];
    
    if (rows && rows.length > 0) {
      const config: Record<string, any> = {}
      rows.forEach((item: any) => {
        try {
            config[item.clave] = JSON.parse(item.valor);
        } catch {
            config[item.clave] = item.valor;
        }
      })
      
      const finalConfig = { ...defaultConfig, ...config }
      
      return NextResponse.json(finalConfig, {
        headers: {
          'Cache-Control': 'public, max-age=30, stale-while-revalidate=60'
        }
      })
    }
  } catch (error) {
    console.error('Database config error:', error)
  }
  
  return NextResponse.json(defaultConfig)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { clave, valor } = body

    if (!clave) {
      return NextResponse.json({ error: 'Clave requerida' }, { status: 400 })
    }

    const valStr = JSON.stringify(valor);
    
    // Check if exists
    const exists = await db.get('SELECT id FROM configuracion WHERE clave = ?', [clave]);
    
    if (exists) {
        await db.run('UPDATE configuracion SET valor = ?, updated_at = CURRENT_TIMESTAMP WHERE clave = ?', [valStr, clave]);
    } else {
        const { v4: uuidv4 } = require('uuid');
        const id = uuidv4(); // We might need to import uuid if not available, or use random
        // If uuid not available in this scope, use simple random
        // But uuid is likely installed.
        // Let's use db's random for now if uuid fails, or rely on client sending IT.
        // Actually we can use crypto.randomUUID() in Node 19+ or just import.
        
        await db.run('INSERT INTO configuracion (id, clave, valor) VALUES (?, ?, ?)', [crypto.randomUUID(), clave, valStr]);
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating config:', error)
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 })
  }
}
