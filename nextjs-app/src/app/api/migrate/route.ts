import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        await db.run('ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS tracking_code TEXT');
        await db.run('ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS tracking_url TEXT');
        return NextResponse.json({ success: true, message: 'Columns checked/added' });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
