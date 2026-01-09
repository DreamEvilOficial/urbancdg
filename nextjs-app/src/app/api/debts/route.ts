import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
        const debt = await db.get('SELECT * FROM deudas WHERE id = ?', [id]);
        if (debt && typeof debt.historial === 'string') {
            debt.historial = JSON.parse(debt.historial);
        }
        return NextResponse.json(debt);
    }

    const debts = await db.all('SELECT * FROM deudas ORDER BY created_at DESC');
    const parsed = debts.map(d => ({
        ...d,
        historial: typeof d.historial === 'string' ? JSON.parse(d.historial) : d.historial
    }));

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Error fetching debts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cliente_nombre, cliente_apellido, cliente_dni, cliente_celular, cliente_direccion, total_deuda } = body;

    const id = uuidv4();
    
    await db.run(`
      INSERT INTO deudas (
        id, cliente_nombre, cliente_apellido, cliente_dni, cliente_celular, cliente_direccion, total_deuda, historial
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, cliente_nombre, cliente_apellido || '', cliente_dni || '', 
      cliente_celular || '', cliente_direccion || '', total_deuda || 0, '[]'
    ]);

    const newDebt = await db.get('SELECT * FROM deudas WHERE id = ?', [id]);
    return NextResponse.json(newDebt);
  } catch (error: any) {
    console.error('Error creating debt:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, total_deuda, historial, estado, monto, descripcion, tipo } = body;

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        // Si se proporciona 'monto' y 'tipo', es un nuevo movimiento
        if (monto && tipo) {
            const debt = await db.get('SELECT * FROM deudas WHERE id = ?', [id]);
            if (!debt) return NextResponse.json({ error: 'Debt not found' }, { status: 404 });

            const currentHistory = typeof debt.historial === 'string' ? JSON.parse(debt.historial) : (debt.historial || []);
            const newMovement = {
                id: uuidv4(),
                fecha: new Date().toISOString(),
                monto,
                descripcion: descripcion || (tipo === 'pago' ? 'Pago recibido' : 'Aumento de deuda'),
                tipo
            };

            const updatedHistory = [...currentHistory, newMovement];
            const newTotal = tipo === 'pago' ? Number(debt.total_deuda) - Number(monto) : Number(debt.total_deuda) + Number(monto);
            const newStatus = newTotal <= 0 ? 'pagado' : 'pendiente';

            await db.run(`
                UPDATE deudas 
                SET total_deuda = ?, historial = ?, estado = ?, updated_at = NOW() 
                WHERE id = ?
            `, [newTotal, JSON.stringify(updatedHistory), newStatus, id]);

            return NextResponse.json({ success: true, newTotal, newStatus });
        }

        // De lo contrario, es una actualización general
        await db.run(`
            UPDATE deudas 
            SET total_deuda = ?, historial = ?, estado = ?, updated_at = NOW() 
            WHERE id = ?
        `, [total_deuda, JSON.stringify(historial || []), estado || 'pendiente', id]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error updating debt:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await db.run('DELETE FROM deudas WHERE id = ?', [id]);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting debt:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
