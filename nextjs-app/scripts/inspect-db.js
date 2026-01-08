const { Pool } = require('pg');
require('dotenv').config();

console.log('Iniciando script...');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.log('No DATABASE_URL');
    process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function inspect() {
  console.log('Conectando...');
  const client = await pool.connect();
  try {
    console.log('🔌 Conectado...');
    
    // Listar columnas de 'usuarios'
    const resColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'usuarios'
    `);
    console.log('Columnas de usuarios:');
    resColumns.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    pool.end();
  }
}

inspect();
