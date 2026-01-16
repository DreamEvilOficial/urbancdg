import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // 1. Fetch Order
    const order = await db.get('SELECT * FROM ordenes WHERE id = ?', [orderId]);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // if already has transfer details, return them (idempotency)
    if (order.total_transferencia && order.transferencia_expiracion) {
        // Check if expired
        const expDate = new Date(order.transferencia_expiracion);
        if (expDate > new Date()) {
             const row = await db.get('SELECT valor FROM configuracion WHERE clave = ?', ['bank_config']);
             let bankConfig = {};
             if (row && row.valor) bankConfig = JSON.parse(row.valor);
             
             return NextResponse.json({
                cbu: bankConfig.cbu || '',
                titular: bankConfig.accountHolder || '',
                bankName: bankConfig.bankName || '',
                alias: bankConfig.alias || '',
                amount: order.total_transferencia,
                expiration: order.transferencia_expiracion
             });
        }
        // If expired, maybe generate new? For now let's just extend or fail.
        // Let's generate new.
    }

    // 2. Calculate Unique Amount
    let uniqueAmount = 0;
    let attempts = 0;
    const baseTotal = Number(order.total);
    
    // Safety check
    if (isNaN(baseTotal) || baseTotal <= 0) {
        return NextResponse.json({ error: 'Order total is invalid' }, { status: 400 });
    }

    while (attempts < 10) {
        // Random cents between 0.01 and 0.99
        // MP sometimes ignores very small decimals? No, it's exact match.
        const cents = Math.floor(Math.random() * 99) + 1;
        uniqueAmount = baseTotal + (cents / 100);
        
        // Check collision (pending orders with same transfer amount in the last 20 mins)
        const collision = await db.get(`
            SELECT id FROM ordenes 
            WHERE total_transferencia = ? 
            AND transferencia_expiracion > NOW()
            AND id != ?
        `, [uniqueAmount, orderId]);
        
        if (!collision) break;
        attempts++;
    }

    if (attempts >= 10) {
        return NextResponse.json({ error: 'Could not generate unique transfer amount, please try again later' }, { status: 503 });
    }
    
    // 3. Set expiration (e.g. 15 minutes)
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 15);
    
    // 4. Update Order
    await db.run(`
        UPDATE ordenes 
        SET total_transferencia = ?, transferencia_expiracion = ? 
        WHERE id = ?
    `, [uniqueAmount, expiration.toISOString(), orderId]);
    
    // 5. Get Bank Config
    const row = await db.get('SELECT valor FROM configuracion WHERE clave = ?', ['bank_config']);
    let bankConfig: any = {};
    if (row && row.valor) {
        try { bankConfig = JSON.parse(row.valor); } catch {}
    }

    return NextResponse.json({
        cbu: bankConfig.cbu || 'CBU NO CONFIGURADO',
        titular: bankConfig.accountHolder || 'TITULAR NO CONFIGURADO',
        bankName: bankConfig.bankName || '',
        alias: bankConfig.alias || '',
        amount: uniqueAmount,
        expiration: expiration.toISOString()
    });

  } catch (err: any) {
    console.error('[transfer/create] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
