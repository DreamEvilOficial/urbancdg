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
     
     // Lista de campos estrictamente verificados que existen en la base de datos
     const allowedKeys = [
       'nombre', 'slug', 'descripcion', 'precio', 'precio_original', 
       'descuento_porcentaje', 'stock_actual', 'stock_minimo', 
       'categoria_id', 'subcategoria_id', 'imagen_url', 'imagenes', 
       'variantes', 'activo', 'destacado', 'top', 'sku'
     ];

     // Build dynamic update query with filtered keys
     const keys = Object.keys(body).filter(k => allowedKeys.includes(k));
     
     if (keys.length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
     }

     const setClause = keys.map(k => `${k} = ?`).join(', ');
     const values = keys.map(k => {
         let val = body[k];
         
         // Serializar campos JSON
         if (['imagenes', 'variantes'].includes(k)) {
             return JSON.stringify(Array.isArray(val) ? val : []);
         }
         
         // Normalizar booleanos
         if (['activo', 'destacado', 'top'].includes(k)) {
             return (val === true || val === 1 || val === 'true') ? 1 : 0;
         }
         
         return val;
     });
     
     values.push(id);

     // Ejecutar con manejo de error detallado
     try {
       const { changes } = await db.run(`UPDATE productos SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
       
       if (changes === 0) {
          return NextResponse.json({ error: 'Product not found' }, { status: 404 });
       }
     } catch (dbErr: any) {
       console.error('Database Update Error:', dbErr.message);
       // Si falla por columna inexistente, devolvemos un error más claro
       return NextResponse.json({ 
         error: 'Error de base de datos', 
         details: dbErr.message 
       }, { status: 500 });
     }

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
