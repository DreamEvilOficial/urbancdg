import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { sanitizeInput, sanitizeRichText } from '@/lib/security';
import { cookies } from 'next/headers';
import { supabase, supabaseAdmin } from '@/lib/supabase';

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
        descuento_activo: product.descuento_activo === true || product.descuento_activo === 1 || product.descuento_activo === 'true',
        imagenes: product.imagenes ? (typeof product.imagenes === 'string' ? JSON.parse(product.imagenes) : product.imagenes) : [],
        variantes: product.variantes ? (typeof product.variantes === 'string' ? JSON.parse(product.variantes) : product.variantes) : [],
        dimensiones: product.dimensiones ? (typeof product.dimensiones === 'string' ? JSON.parse(product.dimensiones) : product.dimensiones) : null,
        metadata: product.metadata ? (typeof product.metadata === 'string' ? JSON.parse(product.metadata) : product.metadata) : null,
    };
    
    return NextResponse.json(parsedProduct);
  } catch (err) {
    console.error('Error fetching product:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  try {
    // 1. Verificar autenticación (Refuerzo de seguridad)
    const cookieStore = cookies();
    const adminSession = cookieStore.get('admin-session')?.value;
    const session = cookieStore.get('session')?.value;
    
    if (!adminSession && !session) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Build dynamic update query
    const body = await req.json();
    const { id: bodyId, ...updates } = body;
    
    // Si viene 'proximamente', sincronizar con 'proximo_lanzamiento' para evitar inconsistencias
    if (updates.proximamente !== undefined && updates.proximo_lanzamiento === undefined) {
        updates.proximo_lanzamiento = updates.proximamente;
    } else if (updates.proximo_lanzamiento !== undefined && updates.proximamente === undefined) {
        updates.proximamente = updates.proximo_lanzamiento;
    }

    const keys = Object.keys(updates);
    
    if (keys.length === 0) {
        return NextResponse.json({ message: 'No changes provided' });
    }

    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const values = keys.map(key => {
        let val = updates[key];
        
        // Sanitize string inputs
        if (typeof val === 'string') {
            if (key === 'descripcion' || key === 'description') {
                val = sanitizeRichText(val);
            } else if (key !== 'imagenes' && key !== 'variantes' && key !== 'metadata' && key !== 'dimensiones') {
                val = sanitizeInput(val);
            }
        }

        // Handle arrays/objects for JSON columns
        if (typeof val === 'object' && val !== null) {
          return JSON.stringify(val);
        }
        return val;
    });
    values.push(id);

    // Preparar detalles del log
    let logDetails = `Updated fields: ${keys.join(', ')}`;
    if (updates.nombre) logDetails += `. Name: ${updates.nombre}`;
    if (updates.precio) logDetails += `. Price: ${updates.precio}`;

    // Intentar realizar la operación
    try {
        // Primero intentamos con transacción si el pool está disponible
        await db.transaction(async (tx) => {
            // Update Product
            const result = await db.run(`UPDATE productos SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values, tx);
            
            if (result.changes === 0) {
                 throw new Error('PRODUCT_NOT_FOUND');
            }

            // Log operation (Intentamos insertar log, pero no fallamos si falla el log)
            try {
                await db.run(`INSERT INTO admin_logs (action, details, target_id) VALUES (?, ?, ?)`, 
                    ['PRODUCT_UPDATE', logDetails, id], tx);
            } catch (logErr) {
                console.warn('Could not write admin log:', logErr);
            }
        });
    } catch (err: any) {
        const message = err.message || '';

        if (message.includes('transacciones requieren una conexión directa') || !process.env.DATABASE_URL) {
            const result = await db.run(`UPDATE productos SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
            
            if (result.changes === 0) {
                 return NextResponse.json({ error: 'Product not found' }, { status: 404 });
            }

            try {
                await db.run(`INSERT INTO admin_logs (action, details, target_id) VALUES (?, ?, ?)`, 
                    ['PRODUCT_UPDATE', logDetails, id]);
            } catch (logErr) {
                console.warn('Could not write admin log (fallback):', logErr);
            }
        } else if (message.toLowerCase().includes('maxclientsinsessionmode') || message.toLowerCase().includes('max clients')) {
            const client = supabaseAdmin || supabase;
            if (!client) {
                throw err;
            }

            const { error } = await client
                .from('productos')
                .update(updates)
                .eq('id', id);

            if (error) {
                throw error;
            }
        } else {
            throw err;
        }
    }

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
