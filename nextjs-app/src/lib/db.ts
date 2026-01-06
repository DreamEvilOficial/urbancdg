import sqlite3 from 'sqlite3';
import path from 'path';

// Enable verbose mode for debugging
const sqlite = sqlite3.verbose();

const dbPath = path.resolve(process.cwd(), '..', 'sql', 'urbancdg.db');

class Database {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite.Database(dbPath, (err) => {
      if (err) {
        console.error('Could not connect to database', err);
      } else {
        console.log('Connected to database at', dbPath);
        this.db.run('PRAGMA journal_mode = WAL'); // Better concurrency
        this.db.run('PRAGMA foreign_keys = ON'); // Enforce FK
        // Ensure required columns exist for resenas table
        this.db.all(`PRAGMA table_info('resenas')`, [], (e, rows: any[]) => {
          if (e) {
            console.warn('PRAGMA table_info resenas failed', e);
            return;
          }
          const names = new Set<string>((rows || []).map((r: any) => String(r.name)));
          if (!names.has('usuario_nombre')) {
            this.db.run(`ALTER TABLE resenas ADD COLUMN usuario_nombre TEXT`, [], (ae) => {
              if (ae) console.warn('ALTER TABLE add usuario_nombre failed', ae);
              else console.log('Added column resenas.usuario_nombre');
            });
          }
          if (!names.has('rating')) {
            this.db.run(`ALTER TABLE resenas ADD COLUMN rating INTEGER DEFAULT 5`, [], (ae) => {
              if (ae) console.warn('ALTER TABLE add rating failed', ae);
              else console.log('Added column resenas.rating');
            });
          }
          if (!names.has('activo')) {
            this.db.run(`ALTER TABLE resenas ADD COLUMN activo INTEGER DEFAULT 1`, [], (ae) => {
              if (ae) console.warn('ALTER TABLE add activo failed', ae);
              else console.log('Added column resenas.activo');
            });
          }
        });

        // Create Indexes for Performance
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_productos_activo_destacado ON productos(activo, destacado)',
            'CREATE INDEX IF NOT EXISTS idx_productos_categoria_id ON productos(categoria_id)',
            'CREATE INDEX IF NOT EXISTS idx_productos_created_at ON productos(created_at)',
            'CREATE INDEX IF NOT EXISTS idx_resenas_producto_id ON resenas(producto_id)',
            'CREATE INDEX IF NOT EXISTS idx_resenas_created_at ON resenas(created_at)'
        ];

        indexes.forEach(idx => {
            this.db.run(idx, [], (err) => {
                if (err) console.warn('Index creation failed', err);
            });
        });
      }
    });
  }

  // Wrapper for db.all (SELECT multiple rows)
  all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  // Wrapper for db.get (SELECT single row)
  get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  }

  // Wrapper for db.run (INSERT, UPDATE, DELETE)
  run(sql: string, params: any[] = []): Promise<{ id: number | string, changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else {
           // 'this' refers to the statement context in sqlite3
           resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  // Helper just to prepare and run, but we just use run() mostly.
  // We don't implement full prepare() statement reuse for simplicity in this migration.
}

const db = new Database();
export default db;
