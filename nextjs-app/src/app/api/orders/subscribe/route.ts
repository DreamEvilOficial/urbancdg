import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

type ResendClient = {
  emails: {
    send: (args: { from: string; to: string | string[]; subject: string; html: string }) => Promise<unknown>
  }
}

let resend: ResendClient | null = null

const getResend = async (): Promise<ResendClient | null> => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[orders/subscribe] RESEND_API_KEY no configurada. Email no enviado.')
    return null
  }
  if (!resend) {
    const { Resend } = await import('resend')
    resend = new Resend(apiKey)
  }
  return resend
}

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

    // Send confirmation email directly
    const client = await getResend()
    if (client) {
      try {
        const result = await client.emails.send({
          from: 'Urban CDG <onboarding@resend.dev>', // Should be updated to verified domain in prod
          to: [trimmedEmail],
          subject: `Suscripción a actualizaciones del pedido ${trimmedOrder}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1>¡Gracias por suscribirte!</h1>
              <p>Te avisaremos cuando haya novedades sobre tu pedido <strong>${trimmedOrder}</strong>.</p>
              <p>Puedes ver el estado en cualquier momento <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://urbancdg.com'}/seguimiento?id=${trimmedOrder}">aquí</a>.</p>
              <hr />
              <p style="font-size: 12px; color: #666;">Urban CDG - Indumentaria</p>
            </div>
          `,
        })

        console.log('Email de suscripción enviado:', result)
      } catch (emailErr) {
        console.error('Excepción al enviar email:', emailErr)
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[orders/subscribe] Error:', error)
    return NextResponse.json({ error: 'Error al registrar suscripción' }, { status: 500 })
  }
}
