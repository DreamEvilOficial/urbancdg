import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const columns = [
      'activo BOOLEAN DEFAULT TRUE',
      'destacado BOOLEAN DEFAULT FALSE',
      'top BOOLEAN DEFAULT FALSE',
      'nuevo_lanzamiento BOOLEAN DEFAULT FALSE',
      'proximamente BOOLEAN DEFAULT FALSE',
      'descuento_activo BOOLEAN DEFAULT FALSE',
      'fecha_lanzamiento TIMESTAMP'
    ];

    const results = [];

    for (const colDef of columns) {
      const colName = colDef.split(' ')[0];
      try {
        await db.raw(`ALTER TABLE productos ADD COLUMN ${colDef}`);
        results.push(`Added ${colName}`);
      } catch (err: any) {
        if (err.message.includes('already exists')) {
          results.push(`${colName} already exists`);
        } else {
          results.push(`Error adding ${colName}: ${err.message}`);
        }
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
