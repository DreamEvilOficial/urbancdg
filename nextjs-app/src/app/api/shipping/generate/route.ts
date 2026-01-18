import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { paqarService } from '@/services/paqarService'

export async function POST(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Server config error' }, { status: 500 })

  try {
    const { orderId, senderData } = await req.json()
    
    // 1. Fetch Order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('ordenes')
      .select('*')
      .eq('id', orderId)
      .single()
    
    if (orderError || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    // 2. Fetch Config from DB
    const { data: configData } = await supabaseAdmin
      .from('configuracion')
      .select('clave, valor')
      .in('clave', ['paqar_api_key', 'paqar_secret', 'paqar_mode'])
    
    const configMap: any = {}
    configData?.forEach((c: any) => configMap[c.clave] = c.valor)

    // Override service config with DB values
    const serviceConfig = {
       ...paqarService.config,
       apiKey: configMap['paqar_api_key'] || process.env.PAQAR_API_KEY,
       secret: configMap['paqar_secret'] || process.env.PAQAR_SECRET,
       mode: configMap['paqar_mode'] || 'test'
    }

    // Force mock mode if configured
    if (serviceConfig.mode === 'test') {
        // We can force the service to use mock token by clearing the key or handling it in service
        // But cleaner is to let service handle it.
        // We will modify PaqarService to accept a 'mode' or just handle it here.
        // If test mode, we pass a special flag or just rely on the existing mock fallback logic
        // But existing fallback logic only works if Key is MISSING.
        // If user puts a fake key in test mode, we might want to ensure it still mocks.
        
        // Let's pass a special 'forceMock' flag to createShipment if possible, or handle it in service.
        // For now, if mode is test, we unset the apiKey passed to the service config (if we were instantiating it)
        // Since paqarService is a singleton object, we should probably modify it to accept config per request or update it.
        // Modifying global singleton is risky for concurrency (though Next.js serverless is usually isolated).
        // Better: create a new instance or pass config to createShipment.
    }

    // 3. Generate Label
    // We pass the resolved config to createShipment (we need to update service to accept this)
    const labelData = await paqarService.createShipment(order, senderData, serviceConfig)

    // 4. Save to History
    const { error: historyError } = await supabaseAdmin
      .from('shipping_history')
      .insert({
        orden_id: orderId,
        tracking_number: labelData.trackingNumber,
        label_url: labelData.labelUrl,
        estado: 'generated',
        datos_remitente: labelData.sender,
        datos_destinatario: labelData.receiver,
        costo: 0 
      })
    
    if (historyError) throw historyError

    // 5. Update Order
    await supabaseAdmin
      .from('ordenes')
      .update({
        estado: 'enviado',
        tracking_code: labelData.trackingNumber,
        tracking_url: labelData.labelUrl || `https://www.correoargentino.com.ar/formularios/ondnc/seguimiento?tn=${labelData.trackingNumber}`
      })
      .eq('id', orderId)

    return NextResponse.json(labelData)

  } catch (error: any) {
    console.error('Shipping generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
