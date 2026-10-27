// Se ejecuta antes de cada archivo de pruebas (ver "setupFiles" en package.json)
require('dotenv').config();

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'secreto-access-de-pruebas-con-longitud-suficiente-123';
process.env.JWT_REFRESH_SECRET = 'secreto-refresh-de-pruebas-con-longitud-suficiente-456';
process.env.BCRYPT_ROUNDS = '4';

// Las pruebas de integración usan DATABASE_URL_TEST (por ejemplo, una rama "test" en Neon).
// Nunca se usa DATABASE_URL para no borrar datos reales.
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || 'postgresql://sin:bd@127.0.0.1:1/sin_bd';
