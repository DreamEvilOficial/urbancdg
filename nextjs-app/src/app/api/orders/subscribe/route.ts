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

    // Invoke Supabase Edge Function to send email
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && anonKey) {
      try {
        // Construct functions URL (remove /v1 or similar if present in base, usually base is https://ref.supabase.co)
        // Standard format: https://<project_ref>.supabase.co/functions/v1/<function_name>
        const functionUrl = `${supabaseUrl}/functions/v1/send-order-email`
        
        console.log('Invoking Supabase Function:', functionUrl)
        
        const res = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`
          },
          body: JSON.stringify({
            order_id: trimmedOrder,
            email: trimmedEmail,
            type: 'subscribe'
          })
        })

        if (!res.ok) {
           const errText = await res.text()
           console.error('Error invoking Supabase Function:', errText)
           // Fallback to direct send if function fails? Or just log.
        } else {
           const data = await res.json()
           console.log('Supabase Function response:', data)
        }
      } catch (fnError) {
        console.error('Exception invoking Supabase Function:', fnError)
      }
    } else {
       // Fallback to local Resend if Supabase not configured (or dev mode)
       const client = await getResend()
       if (client) {
         // ... existing logic ...
          await client.emails.send({
            from: 'Urban CDG <onboarding@resend.dev>',
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
       }
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[orders/subscribe] Error:', error)
    return NextResponse.json({ error: 'Error al registrar suscripción' }, { status: 500 })
  }
}
