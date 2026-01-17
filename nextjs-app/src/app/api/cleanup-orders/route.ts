import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await db.query("DELETE FROM ordenes WHERE estado = 'pendiente'");
    return NextResponse.json({ 
      success: true, 
      message: `Deleted ${result.rowCount} pending orders.` 
    });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
