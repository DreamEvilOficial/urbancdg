import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  try {
    const product = await db.get('SELECT * FROM productos WHERE id = ?', [id]) as any;
    if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    // Parse JSON fields
    const parsedProduct = {
        ...product,
        activo: product.activo === true || product.activo === 1 || product.activo === 'true',
        destacado: product.destacado === true || product.destacado === 1 || product.destacado === 'true',
        top: product.top === true || product.top === 1 || product.top === 'true',
        proximo_lanzamiento: product.proximo_lanzamiento === true || product.proximo_lanzamiento === 1 || product.proximo_lanzamiento === 'true' || product.proximamente === true || product.proximamente === 1 || product.proximamente === 'true',
        proximamente: product.proximamente === true || product.proximamente === 1 || product.proximamente === 'true' || product.proximo_lanzamiento === true || product.proximo_lanzamiento === 1 || product.proximo_lanzamiento === 'true',
        nuevo_lanzamiento: product.nuevo_lanzamiento === true || product.nuevo_lanzamiento === 1 || product.nuevo_lanzamiento === 'true',
        imagenes: product.imagenes ? (typeof product.imagenes === 'string' ? JSON.parse(product.imagenes) : product.imagenes) : [],
        variantes: product.variantes ? (typeof product.variantes === 'string' ? JSON.parse(product.variantes) : product.variantes) : [],
        dimensiones: product.dimensiones ? (typeof product.dimensiones === 'string' ? JSON.parse(product.dimensiones) : product.dimensiones) : null,
        metadata: product.metadata ? (typeof product.metadata === 'string' ? JSON.parse(product.metadata) : product.metadata) : null,
    };
    
    return NextResponse.json(parsedProduct);
  } catch (err) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  try {
    // 2. Build dynamic update query
    const body = await req.json();
    const { id: bodyId, ...updates } = body;
    const keys = Object.keys(updates);
    
    if (keys.length === 0) {
        return NextResponse.json({ message: 'No changes provided' });
    }

    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const values = keys.map(key => {
        const val = updates[key];
        // Handle arrays/objects for JSON columns
        if (typeof val === 'object' && val !== null) {
          return JSON.stringify(val);
        }
        return val;
    });
    values.push(id);

    // Use transaction for atomicity and logging
    await db.transaction(async (tx) => {
        // Ensure logs table exists
        await db.run(`
            CREATE TABLE IF NOT EXISTS admin_logs (
                id SERIAL PRIMARY KEY,
                action TEXT NOT NULL,
                details TEXT,
                target_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `, [], tx);

        // Update Product
        const result = await db.run(`UPDATE productos SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values, tx);
        
        if (result.changes === 0) {
             throw new Error('PRODUCT_NOT_FOUND');
        }

        // Log operation
        let logDetails = `Updated fields: ${keys.join(', ')}`;
        if (updates.descuento_porcentaje) {
            logDetails += `. Discount: ${updates.descuento_porcentaje}%`;
        }
        if (updates.precio) {
            logDetails += `. Price: ${updates.precio}`;
        }
        
        await db.run(`INSERT INTO admin_logs (action, details, target_id) VALUES (?, ?, ?)`, 
            ['PRODUCT_UPDATE', logDetails, id], tx);
    });

    // fetch updated
    const updated = await db.get('SELECT * FROM productos WHERE id = ?', [id]);
    return NextResponse.json(updated);

  } catch (err: any) {
    console.error('Update Error:', err);
    if (err.message === 'PRODUCT_NOT_FOUND') {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update', details: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    const id = params.id;
    try {
        const { changes } = await db.run('DELETE FROM productos WHERE id = ?', [id]);
        if (changes === 0) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
