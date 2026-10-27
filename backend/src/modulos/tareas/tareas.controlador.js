const servicio = require('./tareas.servicio');

async function listar(req, res) {
  res.json(await servicio.listar(req.proyectoId, req.filtros, req.usuario.id));
}

async function backlog(req, res) {
  res.json(await servicio.backlog(req.proyectoId));
}

async function crear(req, res) {
  res.status(201).json(await servicio.crear(req.proyectoId, req.usuario.id, req.body));
}

async function obtener(req, res) {
  res.json(await servicio.obtener(req.parametros.id));
}

async function actualizar(req, res) {
  res.json(await servicio.actualizar(req.parametros.id, req.usuario.id, req.body));
}

async function asignar(req, res) {
  res.json(await servicio.asignar(req.parametros.id, req.usuario.id, req.body.asignado_id));
}

async function mover(req, res) {
  res.json(await servicio.mover(req.parametros.id, req.usuario.id, req.body));
}

async function historial(req, res) {
  res.json(await servicio.historial(req.parametros.id));
}

async function eliminar(req, res) {
  await servicio.eliminar(req.parametros.id, req.usuario, req.rol);
  res.status(204).end();
}

module.exports = { listar, backlog, crear, obtener, actualizar, asignar, mover, historial, eliminar };
