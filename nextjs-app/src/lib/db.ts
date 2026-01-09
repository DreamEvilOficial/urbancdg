import { Pool } from 'pg';
import { supabase, supabaseAdmin } from './supabase';

const client = supabaseAdmin || supabase;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL no está definido. Configura la variable de entorno para conectar a Supabase Postgres.');
}

let pool: Pool | null = null;
if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
}

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
    if (pool) {
      const result = await pool.query(mapSql(sql), params);
      return result.rows as T[];
    }
    if (!client) return [] as T[];
    const selectMatch = sql.match(/FROM\s+(\w+)/i);
    const table = selectMatch?.[1];
    if (!table) return [] as T[];
    let query = client.from(table).select('*');
    const whereMatch = sql.match(/WHERE\s+([\s\S]+?)(?:\s+ORDER BY|\s+LIMIT|$)/i);
    const whereClause = whereMatch?.[1] || '';
    if (whereClause && !/1\s*=\s*1/.test(whereClause)) {
      const orEmailUser = /email\s*=\s*\?\s+OR\s+usuario\s*=\s*\?/i.test(whereClause);
      if (orEmailUser && params.length >= 2) {
        query = query.or(`email.eq.${params[0]},usuario.eq.${params[1]}`);
      }
      if (/slug\s*=\s*\?/i.test(whereClause)) {
        const idx = whereClause.split('?').length - 2 >= 0 ? params.findIndex(() => true) : -1;
        const val = idx >= 0 ? params[0] : undefined;
        if (val !== undefined) query = query.eq('slug', val);
      }
      if (/categoria_id\s*=\s*\?/i.test(whereClause)) {
        const val = params[params.length - 1];
        if (val !== undefined) query = query.eq('categoria_id', val);
      }
      if (/id\s*=\s*\?/i.test(whereClause)) {
        const val = params[0];
        if (val !== undefined) query = query.eq('id', val);
      }
      if (/activo\s*=\s*1/i.test(whereClause)) query = query.eq('activo', true);
      if (/destacado\s*=\s*1/i.test(whereClause)) query = query.eq('destacado', true);
      if (/top\s*=\s*1/i.test(whereClause)) query = query.eq('top', true);
      if (/aprobado\s*=\s*TRUE/i.test(whereClause)) query = query.eq('aprobado', true);
    }
    const orderMatch = sql.match(/ORDER BY\s+(\w+)\s*(ASC|DESC)?/i);
    if (orderMatch) {
      const col = orderMatch[1];
      const dir = (orderMatch[2] || 'ASC').toUpperCase();
      query = query.order(col, { ascending: dir !== 'DESC' });
    }
    const limitParam = sql.match(/LIMIT\s+\?/i) ? params[params.length - 1] : (sql.match(/LIMIT\s+(\d+)/i)?.[1]);
    if (limitParam !== undefined) {
      const n = typeof limitParam === 'string' ? parseInt(limitParam) : limitParam;
      if (!Number.isNaN(n)) query = query.limit(n);
    }
    const { data, error } = await query;
    if (error) {
      console.error(`❌ DB Select Error (${table}):`, error.message);
      throw error;
    }
    return (data as T[]) || ([] as T[]);
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (pool) {
      const result = await pool.query(mapSql(sql), params);
      return (result.rows[0] as T) || undefined;
    }
    if (!client) return undefined as T | undefined;
    const selectMatch = sql.match(/FROM\s+(\w+)/i);
    const table = selectMatch?.[1];
    if (!table) return undefined as T | undefined;
    let query = client.from(table).select('*');
    const whereMatch = sql.match(/WHERE\s+([\s\S]+?)(?:\s+ORDER BY|\s+LIMIT|$)/i);
    const whereClause = whereMatch?.[1] || '';
    if (whereClause && !/1\s*=\s*1/.test(whereClause)) {
      if (/id\s*=\s*\?/i.test(whereClause)) {
        const val = params[0];
        if (val !== undefined) query = query.eq('id', val);
      }
      if (/slug\s*=\s*\?/i.test(whereClause)) {
        const val = params[0];
        if (val !== undefined) query = query.eq('slug', val);
      }
      if (/email\s*=\s*\?(\s+|$)/i.test(whereClause) && !/OR/i.test(whereClause)) {
        const val = params[0];
        if (val !== undefined) query = query.eq('email', val);
      }
      if (/email\s*=\s*\?\s+OR\s+usuario\s*=\s*\?/i.test(whereClause) && params.length >= 2) {
        query = query.or(`email.eq.${params[0]},usuario.eq.${params[1]}`);
      }
    }
    const { data, error } = await query.limit(1);
    if (error) {
      console.error(`❌ DB Get Error (${table}):`, error.message);
      throw error;
    }
    const item = Array.isArray(data) ? data[0] : undefined;
    return (item as T) || undefined;
  }

  async run(sql: string, params: any[] = []): Promise<{ id: string | number | null, changes: number }> {
    if (pool) {
      const result = await pool.query(mapSql(sql), params);
      const id = result.rows?.[0]?.id ?? null;
      const changes = typeof result.rowCount === 'number' ? result.rowCount : 0;
      return { id, changes };
    }
    if (!client) return { id: null, changes: 0 };
    const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([\s\S]+?)\)\s*VALUES\s*\(([\s\S]+?)\)/i);
    if (insertMatch) {
      const table = insertMatch[1];
      const cols = insertMatch[2].split(',').map(s => s.trim());
      const obj: Record<string, any> = {};
      cols.forEach((c, i) => {
        const v = params[i];
        obj[c] = (c === 'activo' || c === 'destacado' || c === 'top') ? (v === 1 || v === true) : v;
      });
      const { data, error } = await client.from(table).insert(obj).select('id');
      if (error) {
        console.error(`❌ DB Insert Error (${table}):`, error.message);
        throw error;
      }
      const id = Array.isArray(data) ? (data[0]?.id ?? null) : null;
      const changes = Array.isArray(data) ? data.length : (data ? 1 : 0);
      return { id, changes };
    }
    const updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET\s+([\s\S]+?)\s+WHERE\s+([\s\S]+)/i);
    if (updateMatch) {
      const table = updateMatch[1];
      const setClause = updateMatch[2];
      const whereClause = updateMatch[3];
      const setColMatch = setClause.match(/(\w+)\s*=\s*\?/);
      const whereColMatch = whereClause.match(/(\w+)\s*=\s*\?/);
      const setCol = setColMatch?.[1];
      const whereCol = whereColMatch?.[1];
      if (setCol && whereCol && params.length >= 2) {
        const value = params[0];
        const idVal = params[1];
        const setValue = (setCol === 'activo' || setCol === 'destacado' || setCol === 'top') ? (value === 1 || value === true) : value;
        const { data, error } = await client.from(table).update({ [setCol]: setValue }).eq(whereCol, idVal).select('id');
        if (error) {
          console.error(`❌ DB Update Error (${table}):`, error.message);
          throw error;
        }
        const changes = Array.isArray(data) ? data.length : (data ? 1 : 0);
        const id = Array.isArray(data) ? (data[0]?.id ?? null) : null;
        return { id, changes };
      }
    }
    return { id: null, changes: 0 };
  }
}

const db = new Database();
export default db;
