/**
 * Aplica en orden los archivos .sql de db/migraciones que aún no se han ejecutado.
 * Uso: npm run db:migrar
 */
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/lib/bd');

const CARPETA = path.join(__dirname, 'migraciones');

async function migrar() {
  const cliente = await pool.connect();
  try {
    await cliente.query(`
      CREATE TABLE IF NOT EXISTS migraciones (
        nombre      VARCHAR(255) PRIMARY KEY,
        aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);

    const { rows } = await cliente.query('SELECT nombre FROM migraciones');
    const aplicadas = new Set(rows.map((r) => r.nombre));

    const archivos = fs.readdirSync(CARPETA).filter((f) => f.endsWith('.sql')).sort();
    let nuevas = 0;

    for (const archivo of archivos) {
      if (aplicadas.has(archivo)) continue;

      const sql = fs.readFileSync(path.join(CARPETA, archivo), 'utf8');
      console.log(`→ Aplicando ${archivo}...`);
      await cliente.query('BEGIN');
      try {
        await cliente.query(sql);
        await cliente.query('INSERT INTO migraciones (nombre) VALUES ($1)', [archivo]);
        await cliente.query('COMMIT');
        nuevas++;
      } catch (err) {
        await cliente.query('ROLLBACK');
        throw new Error(`Falló la migración ${archivo}: ${err.message}`);
      }
    }

    console.log(nuevas ? `✔ ${nuevas} migración(es) aplicada(s)` : '✔ La base de datos ya está al día');
  } finally {
    cliente.release();
  }
}

if (require.main === module) {
  migrar()
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { migrar };
