const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Correct Paths relative to nextjs-app/scripts
const sqlPath = path.join(__dirname, '..', '..', 'database', 'RECREATE-ALL.sql');
const dbPath = path.join(__dirname, '..', '..', 'sql', 'urbancdg.db');

// UUID generation for SQLite default
const uuidDefault = "(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))";

// Read SQL
let sqlContent = fs.readFileSync(sqlPath, 'utf8');

function convertToSqlite(sql) {
    let lines = sql.split('\n');
    let newLines = [];
    let insideCreateFunction = false;

    for (let line of lines) {
        let l = line.trim();
        if (l.startsWith('--') || l === '') continue;

        // Skip PG Functions and Policies
        if (l.toUpperCase().startsWith('CREATE OR REPLACE FUNCTION') || l.toUpperCase().startsWith('CREATE FUNCTION')) {
            insideCreateFunction = true;
            continue;
        }
        if (insideCreateFunction) {
            if (l.includes('$$ LANGUAGE')) insideCreateFunction = false;
            continue;
        }

        if (l.toUpperCase().startsWith('ALTER TABLE') && l.includes('ROW LEVEL SECURITY')) continue;
        if (l.toUpperCase().startsWith('CREATE POLICY')) continue;
        if (l.toUpperCase().startsWith('DROP POLICY')) continue;
        
        // Remove CASCADE from DROP
        l = l.replace(/DROP TABLE IF EXISTS (.*) CASCADE;/gi, 'DROP TABLE IF EXISTS $1;');

        // Data Types Conversion & Defaults
        // Match both gen_random_uuid() and uuid_generate_v4() just in case
        l = l.replace(/UUID PRIMARY KEY DEFAULT gen_random_uuid\(\)/gi, `TEXT PRIMARY KEY DEFAULT ${uuidDefault}`);
        l = l.replace(/UUID PRIMARY KEY DEFAULT uuid_generate_v4\(\)/gi, `TEXT PRIMARY KEY DEFAULT ${uuidDefault}`);
        l = l.replace(/UUID/gi, 'TEXT');
        l = l.replace(/TIMESTAMP WITH TIME ZONE DEFAULT NOW\(\)/gi, "TEXT DEFAULT (datetime('now'))");
        l = l.replace(/TIMESTAMP WITH TIME ZONE/gi, 'TEXT');
        l = l.replace(/JSONB/gi, 'TEXT');
        l = l.replace(/BOOLEAN/gi, 'INTEGER');
        l = l.replace(/true/gi, '1');
        l = l.replace(/false/gi, '0');
        
        // Remove CHECK constraints that might be pg specific if any simple ones
        l = l.replace(/CHECK \(precio >= 0\)/gi, '');

        newLines.push(l);
    }
    return newLines.join('\n');
}

const sqliteSql = convertToSqlite(sqlContent);
const db = new sqlite3.Database(dbPath);

console.log("Migrating Structure (RECREATE-ALL)...");
db.serialize(() => {
    db.run("PRAGMA foreign_keys = OFF;");
    db.run("BEGIN TRANSACTION;");

    const statements = sqliteSql.split(';');
    
    statements.forEach(stmt => {
        if (stmt.trim()) {
            db.run(stmt, (err) => {
                if (err) {
                    console.error("Error running statement:", stmt.substring(0, 100));
                    console.error(err.message);
                }
            });
        }
    });

    db.run("COMMIT;", (err) => {
        if (err) console.error("Commit error:", err);
        else console.log("Structure migration finished successfully.");
    });
});

db.close();
