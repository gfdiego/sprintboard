class HttpError extends Error {
  constructor(estado, mensaje, detalles) {
    super(mensaje);
    this.estado = estado;
    this.detalles = detalles;
  }
}

const solicitudInvalida = (mensaje, detalles) => new HttpError(400, mensaje, detalles);
const noAutorizado = (mensaje = 'No autenticado') => new HttpError(401, mensaje);
const prohibido = (mensaje = 'No tienes permiso para esta acción') => new HttpError(403, mensaje);
const noEncontrado = (mensaje = 'Recurso no encontrado') => new HttpError(404, mensaje);
const conflicto = (mensaje) => new HttpError(409, mensaje);

module.exports = { HttpError, solicitudInvalida, noAutorizado, prohibido, noEncontrado, conflicto };
