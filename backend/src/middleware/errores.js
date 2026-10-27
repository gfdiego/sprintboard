const { HttpError } = require('../utils/errores');

// Errores de PostgreSQL que se traducen a respuestas claras
const ERRORES_PG = {
  '23505': [409, 'Ya existe un registro con esos datos'],
  '23503': [400, 'Referencia a un registro que no existe'],
  '23514': [400, 'Un valor no cumple las reglas permitidas'],
  '22P02': [400, 'Formato de dato inválido'],
};

function rutaNoEncontrada(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function manejarErrores(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.estado).json({ error: err.message, detalles: err.detalles });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es JSON válido' });
  }

  if (err.code && ERRORES_PG[err.code]) {
    const [estado, mensaje] = ERRORES_PG[err.code];
    return res.status(estado).json({ error: mensaje });
  }

  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}

module.exports = { rutaNoEncontrada, manejarErrores };
