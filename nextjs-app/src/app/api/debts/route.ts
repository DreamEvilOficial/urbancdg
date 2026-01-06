import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const debt = await db.get('SELECT * FROM deudas WHERE id = ?', [id]);
      if (debt) {
        try { debt.historial = JSON.parse(debt.historial || '[]'); } catch { debt.historial = []; }
      }
      return NextResponse.json(debt);
    }

    const debts = await db.all('SELECT * FROM deudas ORDER BY created_at DESC');
    debts.forEach((d: any) => {
      try { d.historial = JSON.parse(d.historial || '[]'); } catch { d.historial = []; }
    });

    return NextResponse.json(debts);
  } catch (error) {
    console.error('Error fetching debts:', error);
    return NextResponse.json({ error: 'Error fetching debts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cliente_nombre, cliente_apellido, cliente_dni, cliente_celular, cliente_direccion } = body;

    const id = uuidv4();
    const now = new Date().toISOString();
    
    await db.run(
      `INSERT INTO deudas (id, cliente_nombre, cliente_apellido, cliente_dni, cliente_celular, cliente_direccion, total_deuda, historial, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, 0, '[]', ?, ?)`,
      [id, cliente_nombre || '', cliente_apellido || '', cliente_dni || '', cliente_celular || '', cliente_direccion || '', now, now]
    );

    const newDebt = await db.get('SELECT * FROM deudas WHERE id = ?', [id]);
    
    if (!newDebt) {
       throw new Error('Failed to retrieve created debt');
    }
    
    newDebt.historial = [];

    return NextResponse.json(newDebt);
  } catch (error) {
    console.error('Error creating debt:', error);
    return NextResponse.json({ error: 'Error creating debt', details: String(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, monto, descripcion, tipo } = body;
        
        if (!id || !monto || !tipo) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const debt = await db.get('SELECT * FROM deudas WHERE id = ?', [id]);
        if (!debt) return NextResponse.json({ error: 'Debt not found' }, { status: 404 });

        let history = [];
        try { history = JSON.parse(debt.historial || '[]'); } catch {}

        const amountNum = Number(monto);
        
        const newTransaction = {
            id: uuidv4(),
            tipo,
            monto: amountNum,
            descripcion,
            fecha: new Date().toISOString()
        };

        history.unshift(newTransaction);
        
        const newTotal = tipo === 'deuda' 
            ? (debt.total_deuda || 0) + amountNum 
            : (debt.total_deuda || 0) - amountNum;

        await db.run(
            'UPDATE deudas SET total_deuda = ?, historial = ?, updated_at = ? WHERE id = ?',
            [newTotal, JSON.stringify(history), new Date().toISOString(), id]
        );

        const updatedDebt = await db.get('SELECT * FROM deudas WHERE id = ?', [id]);
        if (updatedDebt) updatedDebt.historial = history;

        return NextResponse.json(updatedDebt);

    } catch (error) {
        console.error('Error updating debt:', error);
        return NextResponse.json({ error: 'Error updating debt' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        await db.run('DELETE FROM deudas WHERE id = ?', [id]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting debt:', error);
        return NextResponse.json({ error: 'Error deleting debt' }, { status: 500 });
    }
}
