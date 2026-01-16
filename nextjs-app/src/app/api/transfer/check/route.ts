import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const order = await db.get('SELECT * FROM ordenes WHERE id = ?', [orderId]);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.estado === 'completado' || order.estado === 'pagado') {
        return NextResponse.json({ status: 'approved', paid: true });
    }

    if (!order.total_transferencia) {
        return NextResponse.json({ error: 'This order is not set up for transfer verification' }, { status: 400 });
    }

    // Check MercadoPago
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) {
        // Fallback: If no token, we can't verify automatically.
        // We just return pending.
        return NextResponse.json({ status: 'pending', paid: false, message: 'MP Token not configured' });
    }

    // Calculate begin_date (Order creation time - 5 mins buffer)
    const orderTime = new Date(order.created_at); 
    // If created_at is not Date object (sqlite string), parse it.
    // Ensure we have a valid date.
    const beginDate = new Date(orderTime.getTime() - 5 * 60000).toISOString();
    
    const amount = Number(order.total_transferencia);

    // Query MP
    // search for approved payments with exact amount since order creation
    const params = new URLSearchParams({
        'sort': 'date_created',
        'criteria': 'desc',
        'range': 'date_created',
        'begin_date': beginDate,
        'transaction_amount': amount.toFixed(2), // Ensure 2 decimals
        'status': 'approved' 
    });

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/search?${params.toString()}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    const mpData = await mpRes.json();
    
    if (!mpRes.ok) {
        console.error('MP Search Error:', mpData);
        // Do not fail hard, just return pending
        return NextResponse.json({ status: 'pending', paid: false }); 
    }

    const payments = mpData.results || [];
    
    // Check if any payment matches
    // We already filtered by amount and status, so existence is strong indicator.
    // Check if it's NOT checking "money_transfer" type logic if API behaves differently.
    // Usually "payment" resource covers everything.
    
    if (payments.length > 0) {
        // MARK AS PAID
        // We use the first match.
        // Important: Idempotency. If this payment was already used for THIS order, fine.
        // If used for ANOTHER order, we prevent collision in create step.
        // Ideally we store the payment_id in the order to prevent reuse.
        
        const paymentId = payments[0].id;
        
        // Prevent double counting if we supported partial payments, but here it's full.
        // We should check if this payment_id is already linked to another order?
        // For now, trusting the unique amount amount collision check.
        
        await db.run('UPDATE ordenes SET estado = ?, updated_at = NOW() WHERE id = ?', ['completado', orderId]);
        
        return NextResponse.json({ status: 'approved', paid: true, payment_id: paymentId });
    }

    return NextResponse.json({ status: 'pending', paid: false });

  } catch (err: any) {
    console.error('[transfer/check] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
