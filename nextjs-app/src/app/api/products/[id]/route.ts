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

    try {
      // 1. First attempt: try to update, including updated_at
      const result = await db.run(`UPDATE productos SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
      
      if (result.changes === 0) {
         return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
    } catch (dbErr: any) {
      console.error('Database Update Error (Attempt 1):', dbErr.message);
      
      const errorMessage = dbErr.message.toLowerCase();

      // 2. Auto-fix: Add missing columns if detected (Postgres specific)
      // Error: column "nuevo_lanzamiento" does not exist
      if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
            // Improve regex to handle "column "name" of relation "table" does not exist"
            const match = errorMessage.match(/column "([^"]+)"/);
            if (match && match[1]) {
                const missingCol = match[1];
                // Only allow adding specific known flags to prevent abuse
                const allowedCols = [
                    'nuevo_lanzamiento', 'proximo_lanzamiento', 'proximamente', 
                    'top', 'destacado', 'activo', 'descuento_activo', 'fecha_lanzamiento',
                    'sku', 'proveedor_nombre', 'proveedor_contacto', 'precio_costo'
                ];
                
                if (allowedCols.includes(missingCol)) {
                    try {
                        console.log(`Auto-adding missing column: ${missingCol}`);
                        // Use raw SQL to add column
                        let type = 'BOOLEAN DEFAULT FALSE';
                        if (missingCol === 'fecha_lanzamiento') type = 'TIMESTAMP';
                        else if (['sku', 'proveedor_nombre', 'proveedor_contacto'].includes(missingCol)) type = 'TEXT';
                        else if (missingCol === 'precio_costo') type = 'NUMERIC';

                        await db.raw(`ALTER TABLE productos ADD COLUMN ${missingCol} ${type}`);
                        
                        // Retry original update with updated_at
                        const result = await db.run(`UPDATE productos SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
                        return NextResponse.json(result);
                    } catch (alterErr) {
                        console.error('Failed to auto-add column:', alterErr);
                        // Continue to fallback
                    }
                }
            }
         }
      
      // 3. Retry Logic: Handle specific column errors (Fallback)
      // If error is about a missing column, try to remove that column from the update
      if (errorMessage.includes('no such column') || errorMessage.includes('has no column') || errorMessage.includes('does not exist')) {
          // Extract column name from error message if possible, or fallback to generic retry
          // Simple fallback: Retry WITHOUT updated_at first
          try {
             const resultRetry = await db.run(`UPDATE productos SET ${setClause} WHERE id = ?`, values);
             if (resultRetry.changes === 0) {
                return NextResponse.json({ error: 'Product not found' }, { status: 404 });
             }
             // Success on retry
             return NextResponse.json({ success: true, warning: 'Updated with limited columns' });
          } catch (retryErr: any) {
             // If it still fails, it might be one of the dynamic keys. 
             // We can't easily guess which one, but we can log it.
             console.error('Database Update Error (Retry 1):', retryErr.message);

             // FINAL ATTEMPT: Filter out known problematic columns like 'descuento_porcentaje' if present in keys
             const problematicColumns = ['descuento_porcentaje', 'precio_original', 'imagen_url', 'categoria_slug', 'subcategoria_slug'];
             
             // Also filter out the specific column that caused the error if identified
             if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
                 const match = errorMessage.match(/column "([^"]+)"/);
                 if (match && match[1]) {
                     problematicColumns.push(match[1]);
                 }
             }

             const safeKeys = keys.filter(k => !problematicColumns.includes(k));
             
             if (safeKeys.length < keys.length) {
                 const safeSetClause = safeKeys.map(key => `${key} = ?`).join(', ');
                 const safeValues = safeKeys.map(key => {
                    const val = updates[key];
                    if (typeof val === 'object' && val !== null) return JSON.stringify(val);
                    return val;
                 });
                 safeValues.push(id);
                 
                 try {
                     await db.run(`UPDATE productos SET ${safeSetClause} WHERE id = ?`, safeValues);
                     // Success on final retry
                     return NextResponse.json({ success: true });
                 } catch (finalErr: any) {
                     return NextResponse.json({ 
                        error: 'Error de base de datos al guardar', 
                        details: finalErr.message 
                     }, { status: 500 });
                 }
             } else {
                 return NextResponse.json({ 
                    error: 'Error de base de datos al guardar', 
                    details: retryErr.message 
                 }, { status: 500 });
             }
          }
      } else {
        // Other DB error
        return NextResponse.json({ 
            error: 'Error de base de datos al guardar', 
            details: dbErr.message 
        }, { status: 500 });
      }
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
