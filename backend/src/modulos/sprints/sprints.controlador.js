const servicio = require('./sprints.servicio');

async function listar(req, res) {
  res.json(await servicio.listar(req.proyectoId));
}

async function crear(req, res) {
  res.status(201).json(await servicio.crear(req.proyectoId, req.body));
}

async function obtener(req, res) {
  res.json(await servicio.obtener(req.parametros.id));
}

async function actualizar(req, res) {
  res.json(await servicio.actualizar(req.parametros.id, req.body));
}

async function iniciar(req, res) {
  res.json(await servicio.iniciar(req.parametros.id, req.body));
}

async function cerrar(req, res) {
  res.json(await servicio.cerrar(req.parametros.id, req.usuario.id));
}

async function eliminar(req, res) {
  await servicio.eliminar(req.parametros.id);
  res.status(204).end();
}

async function tablero(req, res) {
  res.json(await servicio.tablero(req.parametros.id));
}

module.exports = { listar, crear, obtener, actualizar, iniciar, cerrar, eliminar, tablero };
