import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

interface BankConfig {
  cbu?: string
  accountHolder?: string
  bankName?: string
  alias?: string
}

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
        const expDate = new Date(order.transferencia_expiracion);
        if (expDate > new Date()) {
             // Get Config directly to return with the order
             const configRows = await db.all("SELECT clave, valor FROM configuracion WHERE clave IN ('cvu', 'titular_cuenta', 'banco', 'alias', 'bank_config')") as any[];
             const config: Record<string, any> = {};
             configRows.forEach(row => {
                 try { config[row.clave] = JSON.parse(row.valor); } catch { config[row.clave] = row.valor; }
             });

             return NextResponse.json({
                cbu: config.cvu || '',
                titular: config.titular_cuenta || '',
                bankName: config.banco || '',
                alias: config.alias || '',
                amount: order.total_transferencia,
                expiration: order.transferencia_expiracion
             });
        }
    }

    // 2. Calculate Unique Amount
    let uniqueAmount = 0;
    let attempts = 0;
    const baseTotal = Number(order.total);
    
    if (isNaN(baseTotal) || baseTotal <= 0) {
        return NextResponse.json({ error: 'Order total is invalid' }, { status: 400 });
    }

    while (attempts < 10) {
        const cents = Math.floor(Math.random() * 99) + 1;
        uniqueAmount = baseTotal + (cents / 100);
        
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
        return NextResponse.json({ error: 'Could not generate unique transfer amount' }, { status: 503 });
    }
    
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 15);
    
    // 4. Update Order
    await db.run(`
        UPDATE ordenes 
        SET total_transferencia = ?, transferencia_expiracion = ? 
        WHERE id = ?
    `, [uniqueAmount, expiration.toISOString(), orderId]);
    
    // 5. Get Bank Config
    const configRows = await db.all("SELECT clave, valor FROM configuracion WHERE clave IN ('cvu', 'titular_cuenta', 'banco', 'alias', 'bank_config')") as any[];
    const config: Record<string, any> = {};
    configRows.forEach(row => {
        try { config[row.clave] = JSON.parse(row.valor); } catch { config[row.clave] = row.valor; }
    });

    return NextResponse.json({
        cbu: config.cvu || '',
        titular: config.titular_cuenta || '',
        bankName: config.banco || '',
        alias: config.alias || '',
        amount: uniqueAmount,
        expiration: expiration.toISOString()
    });

  } catch (err: any) {
    console.error('[transfer/create] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
