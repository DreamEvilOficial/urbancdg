import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { orderId, email } = await request.json()

    if (!orderId || !email) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }

    const trimmedEmail = String(email).trim().toLowerCase()
    const trimmedOrder = String(orderId).trim()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    if (!/^[A-Za-z0-9\-]+$/.test(trimmedOrder)) {
      return NextResponse.json({ error: 'Número de orden o tracking inválido' }, { status: 400 })
    }

    // Insert into database
    await db.run(
      `INSERT INTO order_subscriptions (order_id, email) VALUES (?, ?) 
       ON CONFLICT (order_id, email) DO UPDATE SET status = 'active'`,
      [trimmedOrder, trimmedEmail]
    )

    console.log('Nueva suscripción de seguimiento registrada en DB', {
      orderId: trimmedOrder,
      email: trimmedEmail
    })

    // Here we would trigger the Edge Function for email confirmation
    // e.g., fetch(`${process.env.SUPABASE_URL}/functions/v1/send-order-email`, ...)
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[orders/subscribe] Error:', error)
    return NextResponse.json({ error: 'Error al registrar suscripción' }, { status: 500 })
  }
}

