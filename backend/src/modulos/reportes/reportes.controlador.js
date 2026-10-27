const servicio = require('./reportes.servicio');

async function carga(req, res) {
  res.json(await servicio.carga(req.proyectoId, req.filtros.sprint));
}

async function velocidad(req, res) {
  res.json(await servicio.velocidad(req.proyectoId));
}

async function burndown(req, res) {
  res.json(await servicio.burndown(req.parametros.id));
}

module.exports = { carga, velocidad, burndown };
