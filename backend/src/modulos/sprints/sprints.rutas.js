const { Router } = require('express');
const { validar } = require('../../middleware/validar');
const { accesoProyecto } = require('../../middleware/miembroProyecto');
const { paramId } = require('../../utils/esquemas');
const esquemas = require('./sprints.esquemas');
const ctrl = require('./sprints.controlador');

// /api/proyectos/:pid/sprints
const rutasProyecto = Router({ mergeParams: true });
rutasProyecto.get('/', accesoProyecto('proyecto', 'observador'), ctrl.listar);
rutasProyecto.post('/', accesoProyecto('proyecto', 'admin'), validar({ body: esquemas.crear }), ctrl.crear);

// /api/sprints/:id
const rutasSprint = Router();
const lectura = [accesoProyecto('sprint', 'observador'), validar({ params: paramId })];
const admin = [accesoProyecto('sprint', 'admin'), validar({ params: paramId })];

rutasSprint.get('/:id', ...lectura, ctrl.obtener);
rutasSprint.get('/:id/tablero', ...lectura, ctrl.tablero);
rutasSprint.patch('/:id', ...admin, validar({ body: esquemas.actualizar }), ctrl.actualizar);
rutasSprint.post('/:id/iniciar', ...admin, validar({ body: esquemas.iniciar }), ctrl.iniciar);
rutasSprint.post('/:id/cerrar', ...admin, ctrl.cerrar);
rutasSprint.delete('/:id', ...admin, ctrl.eliminar);

module.exports = { rutasProyecto, rutasSprint };
