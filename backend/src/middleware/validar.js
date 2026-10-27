const { solicitudInvalida } = require('../utils/errores');

/**
 * Valida body, params y query con esquemas zod.
 *   validar({ body: esquemaBody, params: esquemaParams, query: esquemaQuery })
 * Los valores ya validados quedan en req.body, req.parametros y req.filtros.
 */
function validar(esquemas) {
  return (req, res, next) => {
    for (const [parte, destino] of [['body', 'body'], ['params', 'parametros'], ['query', 'filtros']]) {
      const esquema = esquemas[parte];
      if (!esquema) continue;

      const resultado = esquema.safeParse(req[parte] ?? {});
      if (!resultado.success) {
        const detalles = resultado.error.issues.map((i) => ({
          campo: i.path.join('.') || parte,
          mensaje: i.message,
        }));
        throw solicitudInvalida('Datos inválidos', detalles);
      }
      req[destino] = resultado.data;
    }
    next();
  };
}

module.exports = { validar };
