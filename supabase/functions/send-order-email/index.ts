// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { order_id, email, type } = await req.json()

    if (!email || !order_id) {
      throw new Error('Missing email or order_id')
    }

    console.log(`Sending email to ${email} for order ${order_id}, type: ${type}`)

    // Example using Resend (common with Supabase)
    if (RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Urban CDG <onboarding@resend.dev>',
          to: [email],
          subject: `Suscripción a actualizaciones del pedido ${order_id}`,
          html: `
            <h1>¡Gracias por suscribirte!</h1>
            <p>Te avisaremos cuando haya novedades sobre tu pedido <strong>${order_id}</strong>.</p>
            <p>Puedes ver el estado en cualquier momento <a href="${req.headers.get('origin') || 'https://urbancdg.com'}/seguimiento?id=${order_id}">aquí</a>.</p>
          `,
        }),
      })
      const data = await res.json()
      console.log('Resend response:', data)
    } else {
      console.log('No RESEND_API_KEY configured, skipping actual email send.')
    }

    return new Response(
      JSON.stringify({ message: 'Subscription confirmed and email sent (if configured)' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
