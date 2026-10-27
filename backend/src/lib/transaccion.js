const { pool } = require('./bd');

/**
 * Ejecuta `fn(cliente)` dentro de una transacción.
 * Si `fn` lanza un error se hace ROLLBACK; si termina bien, COMMIT.
 */
async function transaccion(fn) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await fn(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    cliente.release();
  }
}

module.exports = { transaccion };
