const { HttpError } = require('../utils/errores');

const claveIpCorreo = (req) => `${req.ip}|${String(req.body?.correo || '').toLowerCase()}`;

/**
 * Limita los intentos dentro de una ventana de tiempo.
 *   clave:        función que agrupa los intentos (por defecto IP + correo)
 *   soloFallidos: si es true, una respuesta exitosa reinicia el contador (login);
 *                 si es false, también cuentan los éxitos (registro).
 * Guarda los contadores en memoria: sirve para un solo servidor.
 * Con varias instancias habría que moverlo a Redis o a la base de datos.
 */
function limitarIntentos({ maximo = 5, ventanaMs = 15 * 60 * 1000, clave = claveIpCorreo, soloFallidos = true } = {}) {
  const intentos = new Map();

  // Evita que el Map crezca sin límite con claves que ya vencieron
  const purgar = (ahora) => {
    for (const [k, r] of intentos) if (ahora - r.inicio > ventanaMs) intentos.delete(k);
  };

  const middleware = (req, res, next) => {
    const k = clave(req);
    const ahora = Date.now();
    if (intentos.size > 10000) purgar(ahora);

    let registro = intentos.get(k);
    if (!registro || ahora - registro.inicio > ventanaMs) {
      registro = { cantidad: 0, inicio: ahora };
      intentos.set(k, registro);
    }

    if (registro.cantidad >= maximo) {
      const segundos = Math.ceil((registro.inicio + ventanaMs - ahora) / 1000);
      res.set('Retry-After', String(segundos));
      throw new HttpError(429, 'Demasiados intentos. Intenta de nuevo más tarde.');
    }

    registro.cantidad += 1;

    // Si la respuesta es exitosa se reinicia el contador
    if (soloFallidos) {
      res.on('finish', () => {
        if (res.statusCode < 400) intentos.delete(k);
      });
    }

    next();
  };

  middleware.reiniciar = () => intentos.clear();
  return middleware;
}

module.exports = { limitarIntentos };
