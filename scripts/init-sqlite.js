const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'sql', 'urbancdg.db');
const db = new sqlite3.Database(dbPath);

console.log('Initializing database at:', dbPath);

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

const initSchema = async () => {
  try {
      await run('PRAGMA foreign_keys = ON');

      // CONFIGURACION
      await run(`
        CREATE TABLE IF NOT EXISTS configuracion (
          id TEXT PRIMARY KEY,
          clave TEXT UNIQUE NOT NULL,
          valor TEXT NOT NULL,
          descripcion TEXT,
          tipo TEXT DEFAULT 'general',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // BANNERS
      await run(`
        CREATE TABLE IF NOT EXISTS banners (
          id TEXT PRIMARY KEY,
          titulo TEXT,
          subtitulo TEXT,
          imagen_url TEXT NOT NULL,
          imagen_mobile_url TEXT,
          link_url TEXT,
          link_texto TEXT,
          activo INTEGER DEFAULT 1,
          orden INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // USERS
      await run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          full_name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // CATEGORIAS
      await run(`
        CREATE TABLE IF NOT EXISTS categorias (
          id TEXT PRIMARY KEY,
          nombre TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          imagen_url TEXT,
          activo INTEGER DEFAULT 1,
          orden INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // SUBCATEGORIAS
      await run(`
        CREATE TABLE IF NOT EXISTS subcategorias (
          id TEXT PRIMARY KEY,
          categoria_id TEXT NOT NULL,
          nombre TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          activo INTEGER DEFAULT 1,
          orden INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
        )
      `);

      // PRODUCTOS
      await run(`
        CREATE TABLE IF NOT EXISTS productos (
          id TEXT PRIMARY KEY,
          nombre TEXT NOT NULL,
          slug TEXT UNIQUE,
          descripcion TEXT,
          precio REAL NOT NULL,
          precio_original REAL,
          descuento_porcentaje INTEGER,
          stock_actual INTEGER DEFAULT 0,
          stock_minimo INTEGER DEFAULT 5,
          categoria_id TEXT,
          subcategoria_id TEXT,
          imagen_url TEXT,
          imagenes TEXT, -- JSON array
          variantes TEXT, -- JSON array
          activo INTEGER DEFAULT 1,
          destacado INTEGER DEFAULT 0,
          top INTEGER DEFAULT 0,
          sku TEXT,
          peso REAL,
          dimensiones TEXT, -- JSON
          proveedor_nombre TEXT,
          proveedor_contacto TEXT,
          precio_costo REAL,
          metadata TEXT, -- JSON
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
          FOREIGN KEY(subcategoria_id) REFERENCES subcategorias(id) ON DELETE SET NULL
        )
      `);

      // ORDENES
      await run(`
        CREATE TABLE IF NOT EXISTS ordenes (
          id TEXT PRIMARY KEY,
          numero_orden TEXT UNIQUE NOT NULL,
          cliente_nombre TEXT NOT NULL,
          cliente_email TEXT NOT NULL,
          cliente_telefono TEXT,
          direccion_envio TEXT,
          envio REAL,
          subtotal REAL,
          total REAL NOT NULL,
          estado TEXT DEFAULT 'pendiente',
          mercadopago_payment_id TEXT,
          notas TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // RESENAS
      await run(`
        CREATE TABLE IF NOT EXISTS resenas (
          id TEXT PRIMARY KEY,
          producto_id TEXT NOT NULL,
          usuario_nombre TEXT,
          comentario TEXT,
          rating INTEGER DEFAULT 5,
          activo INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(producto_id) REFERENCES productos(id) ON DELETE CASCADE
        )
      `);

      // ETIQUETAS
      await run(`
        CREATE TABLE IF NOT EXISTS etiquetas (
          id TEXT PRIMARY KEY,
          nombre TEXT NOT NULL,
          tipo TEXT,
          color TEXT,
          icono TEXT,
          activo INTEGER DEFAULT 1
        )
      `);

      // PRODUCTOS_ETIQUETAS
      await run(`
        CREATE TABLE IF NOT EXISTS productos_etiquetas (
          producto_id TEXT,
          etiqueta_id TEXT,
          PRIMARY KEY (producto_id, etiqueta_id),
          FOREIGN KEY(producto_id) REFERENCES productos(id) ON DELETE CASCADE,
          FOREIGN KEY(etiqueta_id) REFERENCES etiquetas(id) ON DELETE CASCADE
        )
      `);

      console.log('Tables created successfully.');
  } catch (err) {
      console.error('Schema Error:', err);
      process.exit(1);
  }
};

const initData = async () => {
  try {
      // Check if admin exists
      const admin = await get('SELECT * FROM users WHERE email = ?', ['admin@urbancdg.com']);
      
      if (!admin) {
        const passwordHash = bcrypt.hashSync('admin123', 10);
        await run(`
          INSERT INTO users (id, email, password_hash, role, full_name)
          VALUES (?, ?, ?, ?, ?)
        `, [
          'admin-uuid-placeholder', 
          'admin@urbancdg.com', 
          passwordHash, 
          'admin', 
          'Admin Urban'
        ]);
        console.log('Admin user created (email: admin@urbancdg.com, pass: admin123)');
      }

      // Initial Config
      const configExists = await get("SELECT * FROM configuracion WHERE clave = 'mercadopago_public_key'");
      if (!configExists) {
        // We use INSERT OR IGNORE logic manually with nice async flows
        
        await run(`
          INSERT OR IGNORE INTO configuracion (id, clave, valor, descripcion) VALUES (?, ?, ?, ?)
        `, ['config-mp-key', 'mercadopago_public_key', JSON.stringify('TEST-ejemplo'), 'Clave pública de MercadoPago']);
        
        await run(`
          INSERT OR IGNORE INTO configuracion (id, clave, valor, descripcion) VALUES (?, ?, ?, ?)
        `, ['config-banner-hero', 'hero_banner_url', JSON.stringify('https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=600&fit=crop'), 'Banner principal del hero']);
        
        console.log('Initial configuration inserted.');
      }
  } catch (err) {
      console.error('Data Error:', err);
      process.exit(1);
  }
};

(async () => {
    try {
        await initSchema();
        await initData();
        console.log('Database initialization complete.');
        db.close();
    } catch (err) {
        console.error('Initialization failed:', err);
        process.exit(1);
    }
})();
