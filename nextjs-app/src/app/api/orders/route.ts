import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const id = searchParams.get('id');

    try {
        if (id) {
            const order = await db.get('SELECT * FROM ordenes WHERE id = ?', [id]);
            if (order) {
                // Obtener items de la orden
                const items = await db.all('SELECT * FROM orden_items WHERE orden_id = ?', [id]);
                order.items = items;
            }
            return NextResponse.json(order || null);
        }
        
        let query = 'SELECT * FROM ordenes WHERE 1=1';
        let params: any[] = [];

        if (email) {
            query += ' AND cliente_email = ?';
            params.push(email);
        }

        query += ' ORDER BY created_at DESC';

        const orders = await db.all(query, params);
        return NextResponse.json(orders);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { items, cliente, total, subtotal, envio, notas, metodo_pago, cliente_nombre, cliente_email, cliente_telefono } = body;

        if (!items || !items.length) {
            return NextResponse.json({ error: 'No items in order' }, { status: 400 });
        }

        // Extraer datos del cliente (soportar ambos formatos: objeto o campos directos)
        const nombre = cliente?.nombre || cliente_nombre;
        const email = cliente?.email || cliente_email;
        const telefono = cliente?.telefono || cliente_telefono;

        if (!nombre) {
            return NextResponse.json({ error: 'Cliente nombre es requerido' }, { status: 400 });
        }

        const orderId = uuidv4();
        const numeroOrden = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // USAR TRANSACCIÓN PARA ASEGURAR INTEGRIDAD
        const result = await db.transaction(async (client) => {
            // 1. Crear la orden base
            await client.query(`
                INSERT INTO ordenes (
                    id, numero_orden, cliente_nombre, cliente_email, cliente_telefono,
                    subtotal, total, envio, estado, metodo_pago, notas
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
                orderId, numeroOrden, nombre, email || null, telefono || null,
                subtotal || total || 0, total || 0, envio || 0, 'pendiente', metodo_pago || 'transferencia', notas || ''
            ]);

            // 2. Procesar cada item y actualizar stock
            for (const item of items) {
                // Validar stock disponible
                const productResult = await client.query('SELECT stock_actual, nombre FROM productos WHERE id = $1 FOR UPDATE', [item.producto_id]);
                const product = productResult.rows[0];

                if (!product) {
                    throw new Error(`Producto no encontrado ID: ${item.producto_id}`);
                }

                if (product.stock_actual < item.cantidad) {
                    throw new Error(`Stock insuficiente para: ${product.nombre}. Disponible: ${product.stock_actual}`);
                }

                // Insertar item de orden
                await client.query(`
                    INSERT INTO orden_items (
                        orden_id, producto_id, cantidad, precio_unitario, variante_info
                    ) VALUES ($1, $2, $3, $4, $5)
                `, [
                    orderId, item.producto_id, item.cantidad, item.precio_unitario || item.precio || 0, JSON.stringify(item.variante || item.variante_info || {})
                ]);

                // Descontar stock
                await client.query(`
                    UPDATE productos 
                    SET stock_actual = stock_actual - $1 
                    WHERE id = $2
                `, [item.cantidad, item.producto_id]);
            }

            return { orderId, numeroOrden };
        });

        return NextResponse.json({ 
            success: true, 
            id: result.orderId, 
            numero_orden: result.numeroOrden 
        });

    } catch (err: any) {
        console.error('[orders:POST] Transaction failed:', err.message);
        return NextResponse.json({ 
            error: 'Failed to process order', 
            details: err.message 
        }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, estado } = body;

        if (!id || !estado) {
            return NextResponse.json({ error: 'ID and estado are required' }, { status: 400 });
        }

        await db.run('UPDATE ordenes SET estado = ? WHERE id = ?', [estado, id]);

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[orders:PUT] Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
