const { Router } = require('express');
const { validar } = require('../../middleware/validar');
const { accesoProyecto } = require('../../middleware/miembroProyecto');
const { paramId } = require('../../utils/esquemas');
const esquemas = require('./tareas.esquemas');
const ctrl = require('./tareas.controlador');

// /api/proyectos/:pid/tareas
const rutasProyecto = Router({ mergeParams: true });
rutasProyecto.get('/', accesoProyecto('proyecto', 'observador'), validar({ query: esquemas.filtros }), ctrl.listar);
rutasProyecto.post('/', accesoProyecto('proyecto', 'miembro'), validar({ body: esquemas.crear }), ctrl.crear);

// /api/proyectos/:pid/backlog
const rutasBacklog = Router({ mergeParams: true });
rutasBacklog.get('/', accesoProyecto('proyecto', 'observador'), ctrl.backlog);

// /api/tareas/:id
const rutasTarea = Router();
const lectura = [accesoProyecto('tarea', 'observador'), validar({ params: paramId })];
const escritura = [accesoProyecto('tarea', 'miembro'), validar({ params: paramId })];

rutasTarea.get('/:id', ...lectura, ctrl.obtener);
rutasTarea.get('/:id/historial', ...lectura, ctrl.historial);
rutasTarea.patch('/:id', ...escritura, validar({ body: esquemas.actualizar }), ctrl.actualizar);
rutasTarea.patch('/:id/asignar', ...escritura, validar({ body: esquemas.asignar }), ctrl.asignar);
rutasTarea.patch('/:id/mover', ...escritura, validar({ body: esquemas.mover }), ctrl.mover);
rutasTarea.delete('/:id', ...escritura, ctrl.eliminar);

module.exports = { rutasProyecto, rutasBacklog, rutasTarea };
