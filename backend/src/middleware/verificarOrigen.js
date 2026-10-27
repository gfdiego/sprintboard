const env = require('../config/env');
const { prohibido } = require('../utils/errores');

/**
 * Protección CSRF para las rutas que actúan solo con la cookie (refresh, logout).
 * Segunda capa además de SameSite: rechaza peticiones que el navegador marca como
 * enviadas desde otro sitio. Postman, curl o el propio backend no envían estos
 * headers y pasan.
 */
function verificarOrigen(req, res, next) {
  const origen = req.get('origin');
  if (origen) {
    if (!env.corsOrigen.includes(origen)) throw prohibido('Origen no permitido');
    return next();
  }
  if (req.get('sec-fetch-site') === 'cross-site') throw prohibido('Origen no permitido');
  next();
}

module.exports = { verificarOrigen };
