import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    try {
        let query = 'SELECT * FROM ordenes WHERE 1=1';
        let params: any[] = [];

        if (email) {
            query += ' AND cliente_email = ?';
            params.push(email);
        }

        query += ' ORDER BY created_at DESC';

        const orders = await db.all(query, params);
        return NextResponse.json(orders);
    } catch (err) {
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const id = body.id || uuidv4();
        
        await db.run(`
            INSERT INTO ordenes (
                id, numero_orden, cliente_nombre, cliente_email, cliente_telefono,
                direccion_envio, envio, subtotal, total, estado, mercadopago_payment_id, notas
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?
            )
        `, [
            id, 
            body.numero_orden || Date.now().toString(), 
            body.cliente_nombre, 
            body.cliente_email, 
            body.cliente_telefono,
            body.direccion_envio, 
            body.envio || 0, 
            body.subtotal || 0, 
            body.total, 
            body.estado || 'pendiente', 
            body.mercadopago_payment_id, 
            body.notas
        ]);

        const newOrder = await db.get('SELECT * FROM ordenes WHERE id = ?', [id]);
        return NextResponse.json(newOrder);

    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
}
