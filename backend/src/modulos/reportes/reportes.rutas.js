const { Router } = require('express');
const { validar } = require('../../middleware/validar');
const { accesoProyecto } = require('../../middleware/miembroProyecto');
const { paramId } = require('../../utils/esquemas');
const esquemas = require('./reportes.esquemas');
const ctrl = require('./reportes.controlador');

// /api/proyectos/:pid/reportes
const rutasProyecto = Router({ mergeParams: true });
rutasProyecto.get('/carga', accesoProyecto('proyecto', 'observador'), validar({ query: esquemas.filtrosCarga }), ctrl.carga);
rutasProyecto.get('/velocidad', accesoProyecto('proyecto', 'observador'), ctrl.velocidad);

// /api/sprints/:id/reportes
const rutasSprint = Router();
rutasSprint.get('/:id/reportes/burndown', accesoProyecto('sprint', 'observador'), validar({ params: paramId }), ctrl.burndown);

module.exports = { rutasProyecto, rutasSprint };
