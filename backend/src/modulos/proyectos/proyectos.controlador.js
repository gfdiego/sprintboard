const servicio = require('./proyectos.servicio');

async function listar(req, res) {
  res.json(await servicio.listarDeUsuario(req.usuario.id));
}

async function crear(req, res) {
  const proyecto = await servicio.crear(req.usuario.id, req.body);
  res.status(201).json(proyecto);
}

async function obtener(req, res) {
  const proyecto = await servicio.obtener(req.proyectoId);
  res.json({ ...proyecto, rol: req.rol });
}

async function actualizar(req, res) {
  res.json(await servicio.actualizar(req.proyectoId, req.body));
}

async function eliminar(req, res) {
  await servicio.eliminar(req.proyectoId);
  res.status(204).end();
}

module.exports = { listar, crear, obtener, actualizar, eliminar };
