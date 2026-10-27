const servicio = require('./comentarios.servicio');

async function listar(req, res) {
  res.json(await servicio.listar(req.parametros.id));
}

async function crear(req, res) {
  res.status(201).json(await servicio.crear(req.parametros.id, req.usuario.id, req.body.contenido));
}

async function editar(req, res) {
  res.json(await servicio.editar(req.parametros.id, req.usuario.id, req.body.contenido));
}

async function eliminar(req, res) {
  await servicio.eliminar(req.parametros.id, req.usuario.id, req.rol);
  res.status(204).end();
}

module.exports = { listar, crear, editar, eliminar };
