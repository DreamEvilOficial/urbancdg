import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { items, ordenId, payer, shippingCost } = body

    // Obtener Access Token: Primero desde la DB, luego ENV como fallback
    const db = (await import('@/lib/db')).default
    let token = ''

    const tokenRow = await db.get("SELECT valor FROM configuracion WHERE clave = 'mercadopago_access_token'")
    if (tokenRow && tokenRow.valor) {
      try { token = JSON.parse(tokenRow.valor) } catch { token = tokenRow.valor }
    }

    if (!token) {
      token = process.env.MERCADOPAGO_ACCESS_TOKEN || ''
    }

    if (!token) {
      return NextResponse.json(
        { error: 'MercadoPago no configurado. Ve al Panel → Configuración y completá el Access Token.' },
        { status: 400 }
      )
    }

    // Validar formato básico del token
    const trimmedToken = token.trim()
    if (!trimmedToken.startsWith('APP_USR-') && !trimmedToken.startsWith('TEST-')) {
      return NextResponse.json(
        { error: 'El Access Token tiene un formato inválido. Debe comenzar con APP_USR- (producción) o TEST- (pruebas). Copiálo exactamente desde tu cuenta de MercadoPago.' },
        { status: 400 }
      )
    }

    // Obtener URL base
    const origin = new URL(request.url).origin
    const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || origin
    const base = rawSiteUrl.endsWith('/') ? rawSiteUrl : `${rawSiteUrl}/`
    const successUrlObj = new URL('success', base)
    if (ordenId) successUrlObj.searchParams.set('orden', String(ordenId))
    const failureUrlObj = new URL('checkout', base)
    const pendingUrlObj = new URL('checkout', base)
    const notificationUrlObj = new URL('api/mercadopago/webhook', base)

    // Validar items contra la DB
    const validatedItems = []

    for (const item of items) {
      if (!item.id) continue

      const product = await db.get(
        'SELECT id, nombre, precio, stock_actual, activo FROM productos WHERE id = ?',
        [item.id]
      )

      if (!product || !product.activo) {
        throw new Error(`Producto no disponible: ${item.title}`)
      }

      const quantity = Number(item.quantity)

      if (item.talle && item.color) {
        const variant = await db.get(
          'SELECT stock FROM variantes WHERE producto_id = ? AND talle = ? AND (color = ? OR color_hex = ?)',
          [product.id, item.talle, item.color, item.color]
        )
        if (!variant) {
          throw new Error(`Variante no encontrada: ${product.nombre} ${item.talle} ${item.color}`)
        }
        if (variant.stock < quantity) {
          throw new Error(`Stock insuficiente para ${product.nombre} (${item.talle} ${item.color}). Disponible: ${variant.stock}`)
        }
      } else {
        if ((product.stock_actual || 0) < quantity) {
          throw new Error(`Stock insuficiente para ${product.nombre}. Disponible: ${product.stock_actual}`)
        }
      }

      const realPrice = Number(product.precio)
      if (Math.abs(realPrice - Number(item.unit_price)) > 10) {
        console.warn(`Price mismatch for ${product.nombre}. Client: ${item.unit_price}, Server: ${realPrice}`)
      }

      let title = product.nombre
      if (item.talle || item.color) {
        const parts = []
        if (item.talle) parts.push(item.talle)
        if (item.color) parts.push(item.color)
        title += ` (${parts.join(' - ')})`
      }

      validatedItems.push({
        title,
        unit_price: realPrice,
        quantity,
        currency_id: 'ARS'
      })
    }

    const preference: any = {
      items: validatedItems,
      payer: {
        email: payer.email,
        name: payer.name
      },
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

    console.log('[MP] Creating preference with token prefix:', trimmedToken.substring(0, 12) + '...')

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${trimmedToken}`
      },
      body: JSON.stringify(preference)
    })

    const data = await mpResponse.json()

    if (!mpResponse.ok) {
      console.error('[MP] Error response:', mpResponse.status, JSON.stringify(data))

      if (mpResponse.status === 401) {
        return NextResponse.json(
          { error: 'Access Token de MercadoPago inválido. Verificá que el token en Panel → Configuración sea correcto y no esté vencido. Si cambiaste de cuenta, actualizá también la Public Key.' },
          { status: 401 }
        )
      }

      if (mpResponse.status === 400) {
        return NextResponse.json(
          { error: `Error en los datos enviados a MercadoPago: ${data.message || JSON.stringify(data.cause || data)}` },
          { status: 400 }
        )
      }

      throw new Error(data.message || data.error || `Error MP ${mpResponse.status}`)
    }

    const isTestToken = trimmedToken.startsWith('TEST-')
    
    return NextResponse.json({
      init_point: isTestToken ? (data.sandbox_init_point || data.init_point) : data.init_point,
      id: data.id
    })
  } catch (error: any) {
    console.error('[MP] Error creando preferencia:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear preferencia de pago' },
      { status: 500 }
    )
  }
}
