import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // SQL consolidado del MASTER-SCHEMA para asegurar columnas críticas
    const sql = `
      DO $$
      BEGIN
        -- 1. Asegurar extensiones
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        -- 2. Corregir tabla DEUDAS
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

        -- 3. Corregir tabla RESEÑAS (Normalizar nombres de columnas)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resenas' AND column_name = 'rating') THEN
            ALTER TABLE resenas RENAME COLUMN rating TO calificacion;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resenas' AND column_name = 'usuario_nombre') THEN
            ALTER TABLE resenas RENAME COLUMN usuario_nombre TO cliente_nombre;
        END IF;

        -- 4. Corregir tabla BANNERS
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'banners' AND column_name = 'tipo') THEN
            ALTER TABLE banners ADD COLUMN tipo VARCHAR(50) DEFAULT 'hero';
        END IF;

        -- 5. Asegurar tabla CONFIGURACION
        CREATE TABLE IF NOT EXISTS configuracion (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            clave VARCHAR(100) UNIQUE NOT NULL,
            valor JSONB,
            descripcion TEXT,
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

      END $$;
    `;

    await db.raw(sql);

    return NextResponse.json({ 
        success: true,
        message: 'Esquema actualizado correctamente con el pool de PostgreSQL'
    });

  } catch (error: any) {
    console.error('Error fixing schema:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
