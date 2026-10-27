const env = require('../../config/env');
const servicio = require('./auth.servicio');

// El refresh token viaja solo en esta cookie: JavaScript no la puede leer (httpOnly)
// y el navegador solo la envía a /api/auth.
const COOKIE_REFRESH = 'refreshToken';
const opcionesCookie = {
  httpOnly: true,
  secure: env.cookieSegura,
  sameSite: env.cookieSameSite,
  path: '/api/auth',
};

const contexto = (req) => ({
  ip: req.ip ? req.ip.slice(0, 45) : null,
  agente: (req.get('user-agent') || '').slice(0, 255) || null,
});

/** Pone la cookie y responde solo lo que el frontend puede guardar. */
function responderSesion(res, estado, { usuario, accessToken, refreshToken, refreshExpira }) {
  res.cookie(COOKIE_REFRESH, refreshToken, { ...opcionesCookie, expires: refreshExpira });
  res.set('Cache-Control', 'no-store');
  res.status(estado).json({ usuario, accessToken });
}

async function registro(req, res) {
  responderSesion(res, 201, await servicio.registrar(req.body, contexto(req)));
}

async function login(req, res) {
  responderSesion(res, 200, await servicio.iniciarSesion(req.body, contexto(req)));
}

async function refrescar(req, res) {
  try {
    responderSesion(res, 200, await servicio.refrescar(req.cookies?.[COOKIE_REFRESH], contexto(req)));
  } catch (err) {
    // Si la sesión no sirve se borra la cookie para que el frontend vuelva al login.
    // Con 409 (otra pestaña acaba de renovar) se conserva: la cookie nueva ya es válida.
    if (err.estado !== 409) res.clearCookie(COOKIE_REFRESH, opcionesCookie);
    throw err;
  }
}

async function logout(req, res) {
  await servicio.cerrarSesion(req.cookies?.[COOKIE_REFRESH]);
  res.clearCookie(COOKIE_REFRESH, opcionesCookie);
  res.status(204).end();
}

async function sesiones(req, res) {
  res.json(await servicio.listarSesiones(req.usuario.id, req.cookies?.[COOKIE_REFRESH]));
}

async function cerrarSesion(req, res) {
  const eraActual = await servicio.cerrarSesionPorId(req.usuario.id, req.parametros.id, req.cookies?.[COOKIE_REFRESH]);
  if (eraActual) res.clearCookie(COOKIE_REFRESH, opcionesCookie);
  res.status(204).end();
}

async function logoutTodas(req, res) {
  await servicio.cerrarTodasLasSesiones(req.usuario.id);
  res.clearCookie(COOKIE_REFRESH, opcionesCookie);
  res.status(204).end();
}

async function yo(req, res) {
  const usuario = await servicio.obtenerUsuario(req.usuario.id);
  res.json(usuario);
}

module.exports = { registro, login, refrescar, logout, sesiones, cerrarSesion, logoutTodas, yo };
