import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const bankConfig = {
      cvu: '0000003100094565936544',
      alias: 'Francisco.Tejos.MP', // Placeholder based on context
      accountHolder: 'Francisco Tejos', // Based on image
      bankName: 'Mercado Pago',
      cbu: '0000003100094565936544' // Redundant but consistent
    };

    const valStr = JSON.stringify(bankConfig);

    // Check if exists
    const exists = await db.get('SELECT id FROM configuracion WHERE clave = ?', ['bank_config']);
    
    if (exists) {
        await db.run('UPDATE configuracion SET valor = ?, updated_at = CURRENT_TIMESTAMP WHERE clave = ?', [valStr, 'bank_config']);
    } else {
        const { v4: uuidv4 } = require('uuid');
        await db.run('INSERT INTO configuracion (id, clave, valor) VALUES (?, ?, ?)', [uuidv4(), 'bank_config', valStr]);
    }
    
    // Also update individual keys just in case the frontend still reads them separately (ConfigurationPanel uses /api/config which returns merged keys)
    // The previous implementation of /api/config merged everything.
    // Ideally we should consolidate.
    // Let's update `cvu`, `alias`, etc in configuracion table as separate keys too if needed.
    // ConfigurationPanel loads everything from `configuracion`.
    
    const updates = {
        cvu: '0000003100094565936544',
        alias: 'Francisco.Tejos.MP',
        titular_cuenta: 'Francisco Tejos',
        banco: 'Mercado Pago'
    };
    
    for (const [key, value] of Object.entries(updates)) {
        const row = await db.get('SELECT id FROM configuracion WHERE clave = ?', [key]);
        if (row) {
             await db.run('UPDATE configuracion SET valor = ? WHERE clave = ?', [JSON.stringify(value), key]);
        } else {
             const { v4: uuidv4 } = require('uuid');
             await db.run('INSERT INTO configuracion (id, clave, valor) VALUES (?, ?, ?)', [uuidv4(), key, JSON.stringify(value)]);
        }
    }

    return NextResponse.json({ success: true, config: bankConfig });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
