const sqlite3 = require('sqlite3');
const { randomUUID } = require('crypto');

const db = new sqlite3.Database('sql/urbancdg.db');

const filters = [
  {
    nombre: 'DESCUENTOS',
    clave: 'descuentos',
    icono: '/Discount Icon.gif', // While the frontend handles it by 'clave', storing 'icono' is good practice for fallback
    orden: 1,
    activo: 1
  },
  {
    nombre: 'NUEVOS',
    clave: 'nuevos',
    icono: '/New label.gif',
    orden: 2,
    activo: 1
  },
  {
    nombre: 'PROXIMAMENTE',
    clave: 'proximamente',
    icono: '/Fire.gif',
    orden: 3,
    activo: 1
  }
];

db.serialize(() => {
  // First, verify if table exists (we know it does, but good practice)
  // delete existing content to avoid duplicates and ensure clean slate matching requirements
  db.run("DELETE FROM filtros_especiales", (err) => {
      if (err) {
          console.error("Error clearing table:", err);
          return;
      }
      console.log("Table cleared.");

      const stmt = db.prepare("INSERT INTO filtros_especiales (id, nombre, clave, icono, orden, activo, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))");

      let completed = 0;
      filters.forEach(filter => {
        stmt.run(randomUUID(), filter.nombre, filter.clave, filter.icono, filter.orden, filter.activo, (err) => {
            if (err) console.error(`Error inserting ${filter.nombre}:`, err);
            else console.log(`Inserted ${filter.nombre}`);
            
            completed++;
            if (completed === filters.length) {
                stmt.finalize();
                db.close();
            }
        });
      });
  });
});
// db.close() removed from bottom
