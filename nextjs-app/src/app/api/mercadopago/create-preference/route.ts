import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { items, ordenId, payer, shippingCost } = body

    // Usar SIEMPRE el Access Token del servidor
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN

    if (!token) {
      return NextResponse.json(
        { error: 'MercadoPago no configurado en el servidor (MERCADOPAGO_ACCESS_TOKEN ausente).' },
        { status: 400 }
      )
    }

    // Obtener la URL base del sitio
    const origin = new URL(request.url).origin
    // Preferir envs (para forzar https) y usar el origen como fallback
    const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || origin
    // Normalizar URLs con la API URL para evitar dobles barras o relativas
    const base = rawSiteUrl.endsWith('/') ? rawSiteUrl : `${rawSiteUrl}/`
    const successUrlObj = new URL('success', base)
    if (ordenId) successUrlObj.searchParams.set('orden', String(ordenId))
    const failureUrlObj = new URL('checkout', base)
    const pendingUrlObj = new URL('checkout', base)
    const notificationUrlObj = new URL('api/mercadopago/webhook', base)
    
    // Validar precios contra la base de datos
    const { supabase } = await import('@/lib/supabase')
    const validatedItems = []
    
    for (const item of items) {
      if (!item.id) continue // Skip invalid items

      const { data: product, error } = await supabase
        .from('productos')
        .select('id, nombre, precio, activo')
        .eq('id', item.id)
        .single()
        
      if (error || !product || !product.activo) {
        throw new Error(`Producto no disponible: ${item.title}`)
      }

      // Calcular precio real (aplicando descuento transferencia si corresponde, 
      // aunque MP generalmente se usa para tarjetas, si el usuario eligió MP 
      // asumimos precio de lista o lo que corresponda según lógica de negocio.
      // Aquí usamos el precio de lista base para tarjeta/MP).
      const realPrice = Number(product.precio)
      const quantity = Number(item.quantity)

      // Verificar discrepancia mayor a $10 (tolerancia pequeña)
      if (Math.abs(realPrice - Number(item.unit_price)) > 10) {
        console.warn(`Price mismatch for ${product.nombre}. Client: ${item.unit_price}, Server: ${realPrice}`)
        // Force server price
      }

      validatedItems.push({
        title: product.nombre, // Usar nombre real de la BD
        unit_price: realPrice,
        quantity: quantity,
        currency_id: 'ARS'
      })
    }
    
    // Crear preferencia con items validados
    const preference: any = {
      items: validatedItems,
      payer: {
        email: payer.email,
        name: payer.name
      },
      // No excluir medios de pago para evitar errores como
      // "account money cannot be excluded" en algunas cuentas/regiones
      back_urls: {
        success: successUrlObj.toString(),
        failure: failureUrlObj.toString(),
        pending: pendingUrlObj.toString()
      },
      auto_return: 'approved',
      notification_url: notificationUrlObj.toString(),
      external_reference: ordenId
    }

    if (shippingCost && Number(shippingCost) > 0) {
      preference.shipments = {
        cost: Number(shippingCost),
        mode: 'not_specified'
      }
    }

    console.log('MP preference URLs:', {
      base,
      success: preference.back_urls.success,
      failure: preference.back_urls.failure,
      pending: preference.back_urls.pending,
      notification: preference.notification_url
    })

    console.log('MP preference payload:', JSON.stringify(preference))
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(preference)
    })

    const data = await mpResponse.json()

    if (!mpResponse.ok) {
      console.error('Error de MercadoPago:', data)
      throw new Error(data.message || 'Error al crear preferencia')
    }
    
    return NextResponse.json({
      init_point: data.init_point,
      id: data.id
    })
  } catch (error: any) {
    console.error('Error creando preferencia:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear preferencia de pago' },
      { status: 500 }
    )
  }
}
