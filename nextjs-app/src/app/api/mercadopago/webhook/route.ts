import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const topic = url.searchParams.get('topic') || url.searchParams.get('type')
    const id = url.searchParams.get('id') || url.searchParams.get('data.id')

    console.log(`Webhook received: topic=${topic}, id=${id}`)

    if (!id) {
      return NextResponse.json({ status: 'ok', message: 'No ID provided' })
    }

    if (topic === 'payment' || topic === 'charge') {
      const token = process.env.MERCADOPAGO_ACCESS_TOKEN
      if (!token) {
        console.error('MERCADOPAGO_ACCESS_TOKEN not configured')
        return NextResponse.json({ status: 'error', message: 'Server config error' }, { status: 500 })
      }

      // Fetch payment details from MercadoPago
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        console.error('Failed to fetch payment details from MP')
        return NextResponse.json({ status: 'error', message: 'Failed to fetch payment' }, { status: 500 })
      }

      const paymentData = await res.json()
      const { status, external_reference, status_detail } = paymentData
      const orderId = external_reference

      console.log(`Payment ${id} status: ${status}, detail: ${status_detail}, order: ${orderId}`)

      if (orderId && status === 'approved') {
        // Update order in database using db utility
        await db.run(
          `UPDATE ordenes SET 
            estado = $1, 
            mercadopago_payment_id = $2, 
            updated_at = CURRENT_TIMESTAMP 
           WHERE id = $3 OR numero_orden = $3`,
          ['completado', id, orderId]
        )
        
        console.log(`Order ${orderId} updated to completed`)
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error: any) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 })
  }
}
