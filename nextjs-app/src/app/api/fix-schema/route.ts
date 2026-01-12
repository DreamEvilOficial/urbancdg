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

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resenas' AND column_name = 'comprobante_url') THEN
            ALTER TABLE resenas ADD COLUMN comprobante_url TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resenas' AND column_name = 'numero_orden') THEN
            ALTER TABLE resenas ADD COLUMN numero_orden TEXT;
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

        -- 6. Corregir tabla PRODUCTOS (Nuevos campos y filtros)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'descuento_activo') THEN
            ALTER TABLE productos ADD COLUMN descuento_activo BOOLEAN DEFAULT FALSE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'descuento_porcentaje') THEN
            ALTER TABLE productos ADD COLUMN descuento_porcentaje NUMERIC(5,2) DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'precio_original') THEN
            ALTER TABLE productos ADD COLUMN precio_original NUMERIC(10,2);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'top') THEN
            ALTER TABLE productos ADD COLUMN top BOOLEAN DEFAULT FALSE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'subcategoria_id') THEN
            ALTER TABLE productos ADD COLUMN subcategoria_id UUID REFERENCES subcategorias(id) ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'nuevo_lanzamiento') THEN
            ALTER TABLE productos ADD COLUMN nuevo_lanzamiento BOOLEAN DEFAULT FALSE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'proximamente') THEN
            ALTER TABLE productos ADD COLUMN proximamente BOOLEAN DEFAULT FALSE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'proximo_lanzamiento') THEN
            ALTER TABLE productos ADD COLUMN proximo_lanzamiento BOOLEAN DEFAULT FALSE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'fecha_lanzamiento') THEN
            ALTER TABLE productos ADD COLUMN fecha_lanzamiento TIMESTAMPTZ;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'proveedor_nombre') THEN
            ALTER TABLE productos ADD COLUMN proveedor_nombre TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'proveedor_contacto') THEN
            ALTER TABLE productos ADD COLUMN proveedor_contacto TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'precio_costo') THEN
            ALTER TABLE productos ADD COLUMN precio_costo NUMERIC(10,2);
        END IF;

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
