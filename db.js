const mysql = require('mysql2');
const fs = require('fs');
require('dotenv').config();

const sslEnabled =
  process.env.TIDB_ENABLE_SSL?.toLowerCase() === 'true' ||
  process.env.TIDB_SSL?.toLowerCase() === 'true';
const sslOptions = sslEnabled
  ? process.env.TIDB_CA_FILE
    ? { ca: fs.readFileSync(process.env.TIDB_CA_FILE) }
    : { rejectUnauthorized: false }
  : undefined;

// ── POOL, bukan single connection ──
// Single connection gampang stuck kalau TiDB idle/auto-pause atau network hiccup.
// Pool otomatis bikin koneksi baru kalau ada yang mati, jadi query gak nyangkut selamanya.
const pool = mysql.createPool({
  host: process.env.TIDB_HOST,
  port: process.env.TIDB_PORT,
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: process.env.TIDB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10_000,        // 10 detik max buat connect baru
  ...(sslOptions ? { ssl: sslOptions } : {})
});

const db = pool.promise();

// Cek koneksi awal & bikin tabel dasar
pool.query('SELECT 1', (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('✅ Database connected!');

    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nomor VARCHAR(50) NOT NULL UNIQUE,
        nama VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    const createLogTable = `
      CREATE TABLE IF NOT EXISTS log_perintah (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nomor VARCHAR(50) NOT NULL,
        perintah VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    pool.query(createUsersTable, (createErr) => {
      if (createErr) {
        console.error('Error creating users table:', createErr);
      } else {
        console.log('✅ Tabel users siap.');
      }
    });

    pool.query(createLogTable, (createErr) => {
      if (createErr) {
        console.error('Error creating log_perintah table:', createErr);
      } else {
        console.log('✅ Tabel log_perintah siap.');
      }
    });
  }
});

// ── Watchdog ping berkala — jaga pool tetap hidup & cepat ketauan kalau stuck ──
setInterval(() => {
  pool.query('SELECT 1', (err) => {
    if (err) console.warn('⚠️ DB keep-alive gagal:', err.message);
  });
}, 60_000);

module.exports = pool;
module.exports.db = db;
module.exports.promise = () => db;