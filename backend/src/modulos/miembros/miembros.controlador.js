const servicio = require('./miembros.servicio');
const { prohibido } = require('../../utils/errores');

async function listar(req, res) {
  res.json(await servicio.listar(req.proyectoId));
}

async function agregar(req, res) {
  const miembro = await servicio.agregar(req.proyectoId, req.body);
  res.status(201).json(miembro);
}

async function actualizar(req, res) {
  res.json(await servicio.actualizar(req.proyectoId, req.parametros.uid, req.body));
}

async function eliminar(req, res) {
  const { uid } = req.parametros;
  // Un admin puede quitar a cualquiera; los demás solo pueden salir ellos mismos
  if (req.rol !== 'admin' && uid !== req.usuario.id) {
    throw prohibido('Solo un admin puede quitar a otros miembros');
  }
  await servicio.eliminar(req.proyectoId, uid);
  res.status(204).end();
}

module.exports = { listar, agregar, actualizar, eliminar };
