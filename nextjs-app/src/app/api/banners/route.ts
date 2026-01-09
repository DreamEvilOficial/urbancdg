import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

// Almacenamiento simple en memoria para configuración de banners
let bannersConfigStore: {
  topBanner: { enabled: boolean; image: string; link: string }
  heroBanners: Array<{ image: string; link: string; id: number }>
} = {
  topBanner: {
    enabled: false,
    image: '',
    link: ''
  },
  heroBanners: []
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    
    // Verificar autenticación de admin
    const adminSession = cookieStore.get('admin-session')?.value
    
    if (!adminSession || adminSession !== 'authenticated') {
      return NextResponse.json(
        { error: 'No autorizado - Sesión requerida' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      config: bannersConfigStore
    })

  } catch (error) {
    console.error('Error getting banners config:', error)
    return NextResponse.json(
      { error: 'Error al obtener configuración de banners' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    
    // Verificar autenticación de admin
    const adminSession = cookieStore.get('admin-session')?.value
    
    if (!adminSession || adminSession !== 'authenticated') {
      return NextResponse.json(
        { error: 'No autorizado - Sesión requerida' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const bannerType = formData.get('type') as string
    const file = formData.get('file') as File | null
    const link = formData.get('link') as string || ''
    const enabled = formData.get('enabled') === 'true'

    if (file) {
      if (!supabaseAdmin) {
        throw new Error('Supabase Admin client not available');
      }

      // Procesar upload de archivo a Supabase Storage
      const timestamp = Date.now()
      const fileName = `banners/${bannerType}-${timestamp}.${file.name.split('.').pop()}`
      
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      const { error: uploadError } = await supabaseAdmin.storage
        .from('productos') // Usamos 'productos' bucket que sabemos existe
        .upload(fileName, buffer, {
            contentType: file.type,
            upsert: false
        })

      if (uploadError) {
          throw new Error(`Storage upload failed: ${uploadError.message}`);
      }
      
      const { data: publicUrlData } = supabaseAdmin.storage
        .from('productos')
        .getPublicUrl(fileName)
      
      const publicUrl = publicUrlData.publicUrl
      
      if (bannerType === 'top') {
        bannersConfigStore.topBanner = {
          enabled,
          image: publicUrl,
          link
        }
      } else if (bannerType === 'hero') {
        bannersConfigStore.heroBanners.push({
          image: publicUrl,
          link,
          id: Date.now()
        })
      }
    } else {
      // Solo actualizar configuración sin archivo
      if (bannerType === 'top') {
        bannersConfigStore.topBanner.enabled = enabled
        if (link) bannersConfigStore.topBanner.link = link
      }
    }

    console.log('Banners config updated:', bannerType)

    return NextResponse.json({
      success: true,
      message: 'Banner guardado exitosamente',
      config: bannersConfigStore
    })

  } catch (error) {
    console.error('Error saving banner:', error)
    return NextResponse.json(
      { error: 'Error al guardar banner' },
      { status: 500 }
    )
  }
}
