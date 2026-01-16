import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // 1. Fetch order details
    const order = await db.get('SELECT * FROM ordenes WHERE id = ?', [orderId]);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If already processed, return success immediately
    if (order.estado === 'completado' || order.estado === 'pagado') {
        return NextResponse.json({ status: 'approved', paid: true });
    }

    if (!order.total_transferencia) {
        return NextResponse.json({ error: 'Order not configured for transfer' }, { status: 400 });
    }

    // 2. Check Mercado Pago for matching payment
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) {
        console.warn('[transfer/check] MERCADOPAGO_ACCESS_TOKEN not found in environment');
        return NextResponse.json({ status: 'pending', paid: false, message: 'Verification disabled (no token)' });
    }

    // Search window: from 10 mins before order creation to now
    const orderTime = new Date(order.created_at);
    const beginDate = new Date(orderTime.getTime() - 10 * 60000).toISOString();
    const amount = Number(order.total_transferencia);

    console.log(`[transfer/check] Searching for $${amount.toFixed(2)} since ${beginDate} (Order: ${order.numero_orden})`);

    const params = new URLSearchParams({
        'sort': 'date_created',
        'criteria': 'desc',
        'range': 'date_created',
        'begin_date': beginDate,
        'transaction_amount': amount.toFixed(2),
        'status': 'approved'
    });

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/search?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const mpData = await mpRes.json();
    
    if (!mpRes.ok) {
        console.error('[transfer/check] MP Search failed:', mpData);
        return NextResponse.json({ status: 'pending', error: 'MP Search failed' });
    }

    const payments = mpData.results || [];
    
    if (payments.length > 0) {
        const payment = payments[0];
        console.log(`[transfer/check] MATCH FOUND! MP Payment ID: ${payment.id} for Order: ${order.numero_orden}`);

        // 3. Update order and deduct stock in a transaction
        await db.transaction(async (client) => {
            // Lock order for update
            const freshOrder = await client.query('SELECT estado FROM ordenes WHERE id = $1 FOR UPDATE', [orderId]);
            if (!freshOrder.rows[0] || ['completado', 'pagado'].includes(freshOrder.rows[0].estado)) {
                return; // Already processed
            }

            // Get order items
            const items = await client.query('SELECT * FROM orden_items WHERE orden_id = $1', [orderId]);

            for (const item of items.rows) {
                const productId = item.producto_id;
                const quantity = Number(item.cantidad) || 1;
                let varianteInfo: any = {};
                
                try {
                    varianteInfo = typeof item.variante_info === 'string' 
                        ? JSON.parse(item.variante_info) 
                        : (item.variante_info || {});
                } catch { varianteInfo = {}; }

                // Update Variant Stock if applicable
                if (varianteInfo.talle && varianteInfo.color) {
                    await client.query(`
                        UPDATE variantes 
                        SET stock = stock - $1, updated_at = NOW() 
                        WHERE producto_id = $2 AND talle = $3 AND (color = $4 OR color_hex = $4)
                    `, [quantity, productId, varianteInfo.talle, varianteInfo.color]);
                }

                // Update Main Product Stock
                await client.query(`
                    UPDATE productos 
                    SET stock_actual = stock_actual - $1, updated_at = NOW() 
                    WHERE id = $2
                `, [quantity, productId]);
            }

            // Mark order as completed
            await client.query(`
                UPDATE ordenes 
                SET estado = 'completado', 
                    metodo_pago = 'transferencia',
                    notas = COALESCE(notas, '') || '\n[Verificado Automáticamente: MP ID ' || $1 || ']',
                    updated_at = NOW() 
                WHERE id = $2
            `, [payment.id, orderId]);
        });

        return NextResponse.json({ status: 'approved', paid: true, payment_id: payment.id });
    }

    return NextResponse.json({ status: 'pending', paid: false });

  } catch (err: any) {
    console.error('[transfer/check] Critical error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
