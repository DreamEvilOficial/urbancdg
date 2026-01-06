import { NextRequest, NextResponse } from 'next/server'
import { supabase as publicSupabase } from '@/lib/supabase'
import crypto from 'crypto'

async function fetchPayment(paymentId: string, token: string) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`MercadoPago fetch payment failed: ${res.status} ${txt}`)
  }
  return res.json()
}

export async function POST(request: NextRequest) {
  try {
    // ⚠️ SEGURIDAD: Verificar firma de MercadoPago
    const xSignature = request.headers.get('x-signature')
    const xRequestId = request.headers.get('x-request-id')
    
    let body: any
    try {
      body = await request.json()
    } catch {
      body = {}
    }
    
    // Validar estructura del webhook (no abortar: algunos envían query params)
    if (!body?.type && !body?.data) {
      console.warn('Webhook without body.type/data, will inspect query params')
    }
    
    // 🔒 CRÍTICO: Verificar firma cryptográfica
    if (process.env.MERCADOPAGO_WEBHOOK_SECRET && xSignature) {
      const dataId = body.data?.id || ''
      const expectedSignature = crypto
        .createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET)
        .update(String(dataId))
        .digest('hex')
      
      if (xSignature !== expectedSignature) {
        console.error('🚨 INVALID WEBHOOK SIGNATURE DETECTED!')
        console.error(`Expected: ${expectedSignature}`)
        console.error(`Received: ${xSignature}`)
        console.error(`Data ID: ${dataId}`)
        
        // Registrar intento de fraude usando cliente público
        await publicSupabase.from('admin_logs').insert({
          action: 'WEBHOOK_FRAUD_ATTEMPT',
          table_name: 'ordenes',
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
          new_data: { 
            xSignature, 
            expectedSignature, 
            dataId,
            body 
          }
        })
        
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    } else if (!process.env.MERCADOPAGO_WEBHOOK_SECRET) {
      console.warn('⚠️ MERCADOPAGO_WEBHOOK_SECRET not configured! Webhook verification disabled.')
    }
    
    // Determinar paymentId y tipo desde body o query
    const url = new URL(request.url)
    const topic = body.type || body.topic || url.searchParams.get('topic') || url.searchParams.get('type')
    const dataId = body?.data?.id || body?.data_id || url.searchParams.get('id') || url.searchParams.get('data.id')

    if (topic === 'payment' && dataId) {
      const token = process.env.MERCADOPAGO_ACCESS_TOKEN
      if (!token) {
        console.error('MERCADOPAGO_ACCESS_TOKEN missing for webhook')
        return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
      }

      const payment = await fetchPayment(String(dataId), token)
      const ordenId = payment.external_reference

      if (!ordenId) {
        console.warn('Payment without external_reference', { dataId })
        return NextResponse.json({ ok: true })
      }

      // Mapear estado de MP a estados internos
      let nuevoEstado: 'pendiente' | 'procesando' | 'completado' | 'cancelado'
      switch (payment.status) {
        case 'approved':
          nuevoEstado = 'completado'
          break
        case 'in_process':
          nuevoEstado = 'procesando'
          break
        case 'rejected':
          nuevoEstado = 'cancelado'
          break
        default:
          nuevoEstado = 'pendiente'
      }

      const { data: ordenAnterior } = await publicSupabase
        .from('ordenes')
        .select('estado, mercadopago_payment_id')
        .eq('id', ordenId)
        .single()

      const { error } = await publicSupabase
        .from('ordenes')
        .update({
          estado: nuevoEstado,
          mercadopago_payment_id: Number(payment.id),
          updated_at: new Date().toISOString()
        })
        .eq('id', ordenId)

      if (error) {
        console.error('Error updating order:', error)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      await publicSupabase.from('admin_logs').insert({
        action: 'WEBHOOK_PAYMENT_RECEIVED',
        table_name: 'ordenes',
        record_id: ordenId,
        old_data: ordenAnterior,
        new_data: { estado: nuevoEstado, mercadopago_payment_id: Number(payment.id) },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'MercadoPago Webhook'
      })

      console.log(`✅ Payment processed: order ${ordenId}, payment ${payment.id}, status ${payment.status}`)
    }
    
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error en webhook:', error)
    return NextResponse.json(
      { error: 'Error procesando webhook' },
      { status: 500 }
    )
  }
}
