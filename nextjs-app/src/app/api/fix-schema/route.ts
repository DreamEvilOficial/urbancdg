import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing admin credentials' }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // SQL to fix deudas table
    const sql = `
      DO $$
      BEGIN
        -- Add columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deudas' AND column_name = 'cliente_apellido') THEN
            ALTER TABLE deudas ADD COLUMN cliente_apellido TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deudas' AND column_name = 'cliente_dni') THEN
            ALTER TABLE deudas ADD COLUMN cliente_dni TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deudas' AND column_name = 'cliente_celular') THEN
            ALTER TABLE deudas ADD COLUMN cliente_celular TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deudas' AND column_name = 'cliente_direccion') THEN
            ALTER TABLE deudas ADD COLUMN cliente_direccion TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deudas' AND column_name = 'total_deuda') THEN
            ALTER TABLE deudas ADD COLUMN total_deuda NUMERIC DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deudas' AND column_name = 'historial') THEN
            ALTER TABLE deudas ADD COLUMN historial JSONB DEFAULT '[]';
        END IF;

      END $$;
    `;

    // Execute SQL via RPC if available, or try to use a direct query if possible. 
    // Supabase JS client doesn't support raw SQL directly unless we use rpc.
    // But we can try to use the 'pg' library if we had the connection string.
    // Since we don't have 'pg' configured with the connection string in envs usually (only URL/Key),
    // we rely on the fact that the user might have 'postgres' function exposed or we can't run DDL easily.
    
    // ALTERNATIVE: Use the API to check and update if possible, but DDL is hard via API.
    // If we can't run DDL, we return the SQL for the user to run.
    
    return NextResponse.json({ 
        message: 'Please run this SQL in Supabase SQL Editor',
        sql: sql
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
