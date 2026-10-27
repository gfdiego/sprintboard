const app = require('./app');
const env = require('./config/env');
const { pool } = require('./lib/bd');
const { limpiarSesiones } = require('./modulos/auth/auth.servicio');

const servidor = app.listen(env.puerto, () => {
  console.log(`SprintBoard API escuchando en http://localhost:${env.puerto} (${env.entorno})`);
});

// Cada hora borra los refresh tokens vencidos o revocados
const limpieza = setInterval(() => {
  limpiarSesiones().catch((err) => console.error('Error limpiando sesiones:', err.message));
}, 60 * 60 * 1000);
limpieza.unref();

function apagar(senal) {
  console.log(`\n${senal} recibido. Cerrando servidor...`);
  clearInterval(limpieza);
  servidor.close(() => pool.end().then(() => process.exit(0)));
}

process.on('SIGINT', () => apagar('SIGINT'));
process.on('SIGTERM', () => apagar('SIGTERM'));
