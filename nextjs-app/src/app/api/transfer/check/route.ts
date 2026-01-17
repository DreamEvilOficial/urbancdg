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
    let token = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
    
    // If not in env, check database
    if (!token) {
        const tokenRow = await db.get("SELECT valor FROM configuracion WHERE clave = 'mercadopago_access_token'");
        if (tokenRow && tokenRow.valor) {
            try { token = JSON.parse(tokenRow.valor); } catch { token = tokenRow.valor; }
        }
    }
    
    if (!token) {
        console.warn('[transfer/check] MERCADOPAGO_ACCESS_TOKEN not found in environment or database');
        return NextResponse.json({ status: 'pending', paid: false, message: 'Verification disabled (no token)' });
    }

    // Search window: from 2 hours before order creation to now (broaden to avoid TZ issues)
    const orderTime = new Date(order.created_at);
    const beginDate = new Date(orderTime.getTime() - 120 * 60000).toISOString(); // 2 hours before
    const targetAmount = Number(order.total_transferencia);

    console.log(`[transfer/check] START CHECK - Order: ${order.numero_orden} ($${targetAmount})`);
    
    // Auth Check: Identify which account we are looking at
    try {
        const meRes = await fetch('https://api.mercadopago.com/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (meRes.ok) {
            const meData = await meRes.json();
            console.log(`[transfer/check] Using account: ${meData.first_name} ${meData.last_name} (ID: ${meData.id}, Email: ${meData.email})`);
        } else {
            console.error('[transfer/check] Token validation failed:', await meRes.text());
        }
    } catch (e) {
        console.error('[transfer/check] Error validating token account:', e);
    }

    console.log(`[transfer/check] Search Window: ${beginDate} to NOW`);

    // Broaden search: remove 'transaction_amount' from query to find it manually in the result set
    // This avoids formatting issues with the API's amount filter
    const params = new URLSearchParams({
        'sort': 'date_created',
        'criteria': 'desc',
        'range': 'date_created',
        'begin_date': beginDate,
        'limit': '50'
    });

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/search?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const mpData = await mpRes.json();
    
    if (!mpRes.ok) {
        console.error('[transfer/check] MP API Error Details:', JSON.stringify(mpData));
        // If it's a 401, maybe token is invalid
        return NextResponse.json({ 
            status: 'error', 
            message: 'Error en API de Mercado Pago', 
            details: mpData.message || mpData 
        });
    }

    const payments = mpData.results || [];
    console.log(`[transfer/check] Found ${payments.length} potential payments in the last 2 hours`);

    // Manual filter to find the BEST match
    const validPayment = payments.find((p: any) => {
        const pAmount = Number(p.transaction_amount);
        const isMatch = Math.abs(pAmount - targetAmount) < 0.01;
        const isApproved = p.status === 'approved';
        
        // LOG CADA PAGO PARA DEPURAR EN VERCEL
        console.log(`>>> CHECKING: ID=${p.id}, Status=${p.status}, Amount=${pAmount}, Date=${p.date_created}, Type=${p.operation_type}`);
        
        return isMatch && isApproved;
    });
    
    if (validPayment) {
        console.log(`[transfer/check] MATCH FOUND! ID: ${validPayment.id}`);

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

                // Update Variant Stock
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
            `, [validPayment.id, orderId]);
        });

        return NextResponse.json({ status: 'approved', paid: true, payment_id: validPayment.id });
    }

    return NextResponse.json({ 
        status: 'pending', 
        paid: false, 
        message: `No se encontró el pago de $${targetAmount.toFixed(2)} en los últimos 50 movimientos (Escaneados: ${payments.length})`,
        scanned_count: payments.length
    });

  } catch (err: any) {
    console.error('[transfer/check] Critical error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
