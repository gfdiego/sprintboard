const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { noAutorizado } = require('../utils/errores');

/**
 * Exige un header `Authorization: Bearer <accessToken>` válido.
 * Deja los datos del usuario en req.usuario = { id, correo, nombre }.
 */
function autenticar(req, res, next) {
  const header = req.get('authorization') || '';
  const [esquema, token] = header.split(' ');

  if (esquema !== 'Bearer' || !token) {
    throw noAutorizado('Falta el token de acceso');
  }

  let datos;
  try {
    datos = jwt.verify(token, env.jwtAccessSecret, { algorithms: ['HS256'] });
  } catch (err) {
    throw noAutorizado(err.name === 'TokenExpiredError' ? 'El token expiró' : 'Token inválido');
  }

  // Evita que se use otro tipo de token (por ejemplo, un refresh) como acceso
  if (datos.tipo !== 'access') throw noAutorizado('Token inválido');

  req.usuario = { id: Number(datos.sub), correo: datos.correo, nombre: datos.nombre };
  next();
}

/** Token corto que se envía en cada petición. */
function firmarAccessToken(usuario) {
  return jwt.sign(
    { tipo: 'access', correo: usuario.correo, nombre: usuario.nombre },
    env.jwtAccessSecret,
    { subject: String(usuario.id), expiresIn: env.jwtAccessExpira, algorithm: 'HS256' }
  );
}

/**
 * Token largo que solo sirve para pedir un access token nuevo.
 * Su `jti` es el id de la fila en refresh_tokens.
 */
function firmarRefreshToken(usuarioId) {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ tipo: 'refresh' }, env.jwtRefreshSecret, {
    subject: String(usuarioId),
    jwtid: jti,
    expiresIn: env.jwtRefreshExpira,
    algorithm: 'HS256',
  });
  const expiraEn = new Date(jwt.decode(token).exp * 1000);
  return { token, jti, expiraEn };
}

/** Devuelve { usuarioId, jti } o lanza 401. */
function verificarRefreshToken(token) {
  let datos;
  try {
    datos = jwt.verify(token, env.jwtRefreshSecret, { algorithms: ['HS256'] });
  } catch (err) {
    throw noAutorizado(err.name === 'TokenExpiredError' ? 'La sesión expiró' : 'Sesión inválida');
  }
  if (datos.tipo !== 'refresh' || !datos.jti) throw noAutorizado('Sesión inválida');
  return { usuarioId: Number(datos.sub), jti: datos.jti };
}

module.exports = { autenticar, firmarAccessToken, firmarRefreshToken, verificarRefreshToken };
