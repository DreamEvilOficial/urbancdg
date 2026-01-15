const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load .env manually
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = require('dotenv').parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function simulateUpdate() {
  const client = await pool.connect();
  try {
    console.log('Connected to DB');

    // 1. Get a product ID
    const res = await client.query('SELECT id, nombre, variantes FROM productos LIMIT 1');
    if (res.rows.length === 0) {
        console.log('No products found to test update.');
        return;
    }
    const product = res.rows[0];
    const id = product.id;
    console.log(`Testing update on product: ${product.nombre} (${id})`);

    // 2. Start Transaction
    await client.query('BEGIN');

    // 3. Update Product (Simulate basic update)
    const updateQuery = `UPDATE productos SET nombre = $1, updated_at = NOW() WHERE id = $2`;
    await client.query(updateQuery, [product.nombre + ' (Test Update)', id]);
    console.log('Product table updated successfully.');

    // 4. Simulate Sync Variants (The problematic part) with ON CONFLICT
    try {
        console.log('Attempting to sync variants (simulate with ON CONFLICT)...');
        
        // Use normalized SQL similar to db.ts logic but pg-native ($1, $2...)
        // Original code uses ON CONFLICT (producto_id, talle, color_hex)
        const variantSql = `
            INSERT INTO variantes (producto_id, talle, color, color_hex, stock, sku, activo, updated_at)
            VALUES ($1, 'L', 'Negro', '#000000', 10, 'TEST-SKU', true, NOW())
            ON CONFLICT (producto_id, talle, color_hex) DO UPDATE SET
                stock = EXCLUDED.stock,
                updated_at = NOW()
        `;
        await client.query(variantSql, [id]);
        console.log('Variants table updated successfully with ON CONFLICT.');
    } catch (err) {
        console.warn('Caught expected error updating variants table:', err.message);
        console.log('Likely cause: Missing UNIQUE constraint on (producto_id, talle, color_hex)');
    }

    // 5. Commit
    await client.query('COMMIT');
    console.log('Transaction COMMITTED successfully.');

    // 6. Verify Update
    const check = await client.query('SELECT nombre FROM productos WHERE id = $1', [id]);
    console.log('New name:', check.rows[0].nombre);

    // 7. Revert changes (Optional, but good practice for test)
    await client.query('UPDATE productos SET nombre = $1 WHERE id = $2', [product.nombre, id]);
    console.log('Reverted changes.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Transaction FAILED (Rollback):', err);
  } finally {
    client.release();
    pool.end();
  }
}

simulateUpdate();
