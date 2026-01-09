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
        proximo_lanzamiento: product.proximo_lanzamiento === true || product.proximo_lanzamiento === 1 || product.proximo_lanzamiento === 'true',
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
     const body = await req.json();
     
     // Build dynamic update query
     const keys = Object.keys(body).filter(k => k !== 'id' && k !== 'created_at');
     if (keys.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

     const setClause = keys.map(k => `${k} = ?`).join(', ');
     const values = keys.map(k => {
         let val = body[k];
         if (k === 'imagenes' || k === 'variantes' || k === 'dimensiones' || k === 'metadata') {
             return JSON.stringify(val);
         }
         if (k === 'activo' || k === 'destacado' || k === 'top') {
             return val ? 1 : 0;
         }
         return val;
     });
     values.push(id);

     const { changes } = await db.run(`UPDATE productos SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);

     if (changes === 0) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
     }

     // fetch updated
     const updated = await db.get('SELECT * FROM productos WHERE id = ?', [id]);
     return NextResponse.json(updated);

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
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
