const { Pool, types } = require('pg');
const env = require('../config/env');

// Las columnas DATE se devuelven como texto 'AAAA-MM-DD' para evitar
// corrimientos de un día por la zona horaria del servidor.
types.setTypeParser(1082, (valor) => valor);
// COUNT y SUM de BIGINT llegan como texto; los convertimos a número.
types.setTypeParser(20, (valor) => Number(valor));

// Pool de conexiones hacia Neon. La cadena incluye sslmode=require.
const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err.message);
});

/**
 * Ejecuta una consulta parametrizada. Nunca concatenes valores en el SQL:
 * usa $1, $2... y pásalos en `parametros`.
 */
function consulta(sql, parametros = []) {
  return pool.query(sql, parametros);
}

module.exports = { pool, consulta };
