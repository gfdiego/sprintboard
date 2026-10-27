const servicio = require('./etiquetas.servicio');

async function listar(req, res) {
  res.json(await servicio.listar(req.proyectoId));
}

async function crear(req, res) {
  res.status(201).json(await servicio.crear(req.proyectoId, req.body));
}

async function eliminar(req, res) {
  await servicio.eliminar(req.proyectoId, req.parametros.eid);
  res.status(204).end();
}

async function reemplazarEnTarea(req, res) {
  res.json(await servicio.reemplazarEnTarea(req.parametros.id, req.proyectoId, req.usuario.id, req.body.etiquetas));
}

module.exports = { listar, crear, eliminar, reemplazarEnTarea };
