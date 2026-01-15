import { Resend } from 'resend';
import { formatPrice } from '@/lib/formatters';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'Urban CDG <onboarding@resend.dev>'; // Usar dominio verificado en producción

export const sendEmail = async (to: string, subject: string, html: string) => {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.warn('[EMAIL] RESEND_API_KEY no configurada. Email no enviado.');
            return false;
        }

        await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject,
            html
        });
        return true;
    } catch (error) {
        console.error('[EMAIL] Error enviando email:', error);
        return false;
    }
};

export async function sendOrderConfirmation(order: any, items: any[]) {
  if (!order.cliente_email) return;

  try {
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
            ${item.nombre || item.title || 'Producto'} ${item.variante_info ? `(${item.variante_info.talle || ''} ${item.variante_info.color || ''})` : ''}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.cantidad}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">$${formatPrice(item.precio_unitario || item.precio || 0)}</td>
      </tr>
    `).join('');

    await resend.emails.send({
      from: FROM_EMAIL,
      to: order.cliente_email,
      subject: `Confirmación de Orden #${order.numero_orden}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #000;">¡Gracias por tu compra, ${order.cliente_nombre}!</h1>
          <p>Hemos recibido tu pedido <strong>#${order.numero_orden}</strong>.</p>
          
          <h2 style="border-bottom: 2px solid #000; padding-bottom: 10px;">Detalles del pedido</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="text-align: left; padding: 10px;">Producto</th>
                <th style="text-align: left; padding: 10px;">Cant.</th>
                <th style="text-align: left; padding: 10px;">Precio</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div style="text-align: right; margin-bottom: 20px;">
            <p style="font-size: 18px;"><strong>Total: $${formatPrice(order.total)}</strong></p>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <p style="margin: 0;"><strong>Dirección de envío:</strong><br/>${order.direccion_envio || 'Retiro en local'}</p>
          </div>
          
          <p style="color: #666; font-size: 14px;">Te enviaremos otro correo cuando tu pedido sea despachado y tenga un código de seguimiento.</p>
        </div>
      `
    });
    console.log(`[Email] Order confirmation sent to ${order.cliente_email}`);
  } catch (error) {
    console.error('[Email] Failed to send order confirmation:', error);
  }
}

export async function sendShippingUpdate(order: any, trackingCode: string) {
  if (!order.cliente_email) return;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: order.cliente_email,
      subject: `Tu pedido #${order.numero_orden} ha sido enviado`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #000;">¡Tu pedido está en camino!</h1>
          <p>Hola ${order.cliente_nombre},</p>
          <p>Tu pedido <strong>#${order.numero_orden}</strong> ha sido despachado y está en manos del correo.</p>
          
          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bbf7d0;">
              <p style="margin: 0; color: #166534; font-weight: bold; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Código de Seguimiento</p>
              <p style="margin: 10px 0; font-size: 24px; font-family: monospace; letter-spacing: 2px;">${trackingCode}</p>
          </div>
          
          <p>Podés seguir tu envío ingresando este código en nuestra página de seguimiento o en la web del correo.</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/seguimiento?id=${order.numero_orden}" 
               style="display: inline-block; background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 30px; font-weight: bold;">
               Ver Estado del Pedido
            </a>
          </div>
        </div>
      `
    });
    console.log(`[Email] Shipping update sent to ${order.cliente_email}`);
  } catch (error) {
    console.error('[Email] Failed to send shipping update:', error);
  }
}
