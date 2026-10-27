require('dotenv').config();

const entorno = process.env.NODE_ENV || 'development';

function requerida(nombre) {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}. Revisa tu archivo .env`);
  }
  return valor;
}

const jwtAccessSecret = requerida('JWT_ACCESS_SECRET');
const jwtRefreshSecret = requerida('JWT_REFRESH_SECRET');
if (jwtAccessSecret === jwtRefreshSecret) {
  throw new Error('JWT_ACCESS_SECRET y JWT_REFRESH_SECRET deben ser distintos');
}
if (entorno === 'production' && (jwtAccessSecret.length < 32 || jwtRefreshSecret.length < 32)) {
  throw new Error('Los secretos JWT deben tener al menos 32 caracteres en producción');
}

// strict: frontend y API en el mismo sitio. none: dominios distintos (exige HTTPS).
const cookieSameSite = (process.env.COOKIE_SAMESITE || 'strict').toLowerCase();
if (!['strict', 'lax', 'none'].includes(cookieSameSite)) {
  throw new Error('COOKIE_SAMESITE debe ser strict, lax o none');
}

// Cuántos proxies hay delante del servidor (Render, Railway, Nginx…). Con 0 se usa
// la IP de la conexión; con 1 se toma la de X-Forwarded-For puesta por ese proxy.
const trustProxy = Number(process.env.TRUST_PROXY || 0);
if (!Number.isInteger(trustProxy) || trustProxy < 0) {
  throw new Error('TRUST_PROXY debe ser un entero >= 0');
}

module.exports = {
  entorno,
  trustProxy,
  puerto: Number(process.env.PORT) || 3000,
  databaseUrl: requerida('DATABASE_URL'),
  jwtAccessSecret,
  jwtRefreshSecret,
  jwtAccessExpira: process.env.JWT_ACCESS_EXPIRA || '15m',
  jwtRefreshExpira: process.env.JWT_REFRESH_EXPIRA || '1d',
  cookieSameSite,
  // SameSite=None solo funciona con Secure, así que se fuerza
  cookieSegura: entorno === 'production' || cookieSameSite === 'none',
  corsOrigen: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((o) => o.trim()),
  bcryptRondas: Number(process.env.BCRYPT_ROUNDS) || 12,
};
