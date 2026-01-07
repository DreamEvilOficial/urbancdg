import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL no está definido. Configura la variable de entorno para conectar a Supabase Postgres.');
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

function mapSql(sql: string): string {
  let index = 0;
  const replaced = sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
  return replaced
    .replace(/\bCURRENT_TIMESTAMP\b/g, 'NOW()')
    .replace(/\bdatetime\('now'\)\b/gi, 'NOW()')
    .replace(/\bactivo\s*=\s*1\b/gi, 'activo = TRUE')
    .replace(/\bactivo\s*=\s*0\b/gi, 'activo = FALSE')
    .replace(/\bdestacado\s*=\s*1\b/gi, 'destacado = TRUE')
    .replace(/\bdestacado\s*=\s*0\b/gi, 'destacado = FALSE')
    .replace(/\btop\s*=\s*1\b/gi, 'top = TRUE')
    .replace(/\btop\s*=\s*0\b/gi, 'top = FALSE');
}

class Database {
  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const result = await pool.query(mapSql(sql), params);
    return result.rows as T[];
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const result = await pool.query(mapSql(sql), params);
    return (result.rows[0] as T) || undefined;
  }

  async run(sql: string, params: any[] = []): Promise<{ id: string | number | null, changes: number }> {
    const result = await pool.query(mapSql(sql), params);
    const id = result.rows?.[0]?.id ?? null;
    const changes = typeof result.rowCount === 'number' ? result.rowCount : 0;
    return { id, changes };
  }
}

const db = new Database();
export default db;
