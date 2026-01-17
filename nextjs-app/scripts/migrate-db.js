const db = require('../src/lib/db');

async function runMigration() {
  console.log('Running migration...');
  try {
    // 1. Asegurar extensiones
    await db.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // 2. Add columns if they don't exist
    const columns = [
      { table: 'productos', column: 'desbloqueado_desde', type: 'TIMESTAMPTZ' },
      { table: 'productos', column: 'fecha_lanzamiento', type: 'TIMESTAMPTZ' },
      { table: 'productos', column: 'proximo_lanzamiento', type: 'BOOLEAN DEFAULT FALSE' },
      { table: 'productos', column: 'proximamente', type: 'BOOLEAN DEFAULT FALSE' },
      { table: 'productos', column: 'descuento_activo', type: 'BOOLEAN DEFAULT FALSE' },
      { table: 'productos', column: 'descuento_porcentaje', type: 'NUMERIC(5,2) DEFAULT 0' },
      { table: 'productos', column: 'precio_original', type: 'NUMERIC(10,2)' },
      { table: 'productos', column: 'precio_costo', type: 'NUMERIC(10,2)' },
      { table: 'productos', column: 'proveedor_nombre', type: 'TEXT' },
      { table: 'productos', column: 'proveedor_contacto', type: 'TEXT' },
      { table: 'productos', column: 'imagen_url', type: 'TEXT' },
      { table: 'productos', column: 'sku', type: 'TEXT' },
      { table: 'productos', column: 'metadata', type: 'JSONB DEFAULT \'{}\'' },
      { table: 'productos', column: 'stock_minimo', type: 'INTEGER DEFAULT 0' }
    ];

    for (const col of columns) {
      try {
        const check = await db.query(
          `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
          [col.table, col.column]
        );
        if (check.rows.length === 0) {
            console.log(`Adding column ${col.column} to ${col.table}...`);
            await db.query(`ALTER TABLE ${col.table} ADD COLUMN ${col.column} ${col.type}`);
        } else {
            console.log(`Column ${col.column} already exists in ${col.table}.`);
        }
      } catch (err) {
        console.error(`Error checking/adding column ${col.column}:`, err.message);
      }
    }
    
    console.log('Migration completed.');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

runMigration();
