import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Use admin client if available, else db fallback
      if (supabaseAdmin) {
          const { data, error } = await supabaseAdmin.from('deudas').select('*').eq('id', id).single();
          if (error) throw error;
          if (data) {
              try { data.historial = JSON.parse(data.historial || '[]'); } catch { data.historial = []; }
          }
          return NextResponse.json(data);
      }
      
      const debt = await db.get('SELECT * FROM deudas WHERE id = ?', [id]);
      if (debt) {
        try { debt.historial = JSON.parse(debt.historial || '[]'); } catch { debt.historial = []; }
      }
      return NextResponse.json(debt);
    }

    if (supabaseAdmin) {
        const { data, error } = await supabaseAdmin.from('deudas').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        data?.forEach((d: any) => {
            try { d.historial = JSON.parse(d.historial || '[]'); } catch { d.historial = []; }
        });
        return NextResponse.json(data || []);
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
    
    // Prefer supabaseAdmin for reliable insertion and return
    if (supabaseAdmin) {
        const { data, error } = await supabaseAdmin.from('deudas').insert({
            id,
            cliente_nombre: cliente_nombre || '',
            cliente_apellido: cliente_apellido || '',
            cliente_dni: cliente_dni || '',
            cliente_celular: cliente_celular || '',
            cliente_direccion: cliente_direccion || '',
            total_deuda: 0,
            historial: '[]',
            created_at: now,
            updated_at: now
        }).select().single();

        if (error) throw error;
        
        // Parse historial just in case
        if (data) {
             try { data.historial = JSON.parse(data.historial || '[]'); } catch { data.historial = []; }
        }
        return NextResponse.json(data);
    }

    // Fallback to db.run if admin not available (unlikely in prod if configured)
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
  } catch (error: any) {
    console.error('Error creating debt:', error);
    return NextResponse.json({ error: 'Error creating debt', details: error.message || String(error) }, { status: 500 });
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
