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
