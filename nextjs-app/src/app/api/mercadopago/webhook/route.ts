import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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
      const { status, external_reference, transaction_details, date_approved } = paymentData
      const orderId = external_reference

      console.log(`Payment ${id} status: ${status}, order: ${orderId}`)

      if (orderId && status === 'approved') {
        // Update order in Supabase
        const { error } = await supabase
          .from('ordenes')
          .update({
            estado: 'completado', // Map to "Completado"
            pago_id: id,
            pago_estado: status,
            pago_metodo: 'mercadopago',
            updated_at: new Date().toISOString(),
            // Factura simulation
            factura_url: `https://api.mercadopago.com/v1/payments/${id}/ticket` // Not a real legal invoice, but a receipt
          })
          .eq('id', orderId)

        if (error) {
          console.error('Error updating order:', error)
          return NextResponse.json({ status: 'error', message: 'DB update failed' }, { status: 500 })
        }
        
        console.log(`Order ${orderId} updated to completed`)
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error: any) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 })
  }
}
