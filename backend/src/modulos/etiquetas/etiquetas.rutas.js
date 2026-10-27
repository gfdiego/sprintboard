const { Router } = require('express');
const { validar } = require('../../middleware/validar');
const { accesoProyecto } = require('../../middleware/miembroProyecto');
const { paramId } = require('../../utils/esquemas');
const esquemas = require('./etiquetas.esquemas');
const ctrl = require('./etiquetas.controlador');

// /api/proyectos/:pid/etiquetas
const rutasProyecto = Router({ mergeParams: true });
rutasProyecto.get('/', accesoProyecto('proyecto', 'observador'), ctrl.listar);
rutasProyecto.post('/', accesoProyecto('proyecto', 'miembro'), validar({ body: esquemas.crear }), ctrl.crear);
rutasProyecto.delete(
  '/:eid',
  accesoProyecto('proyecto', 'admin'),
  validar({ params: esquemas.paramsEtiqueta }),
  ctrl.eliminar
);

// /api/tareas/:id/etiquetas
const rutasTarea = Router();
rutasTarea.put(
  '/:id/etiquetas',
  accesoProyecto('tarea', 'miembro'),
  validar({ params: paramId, body: esquemas.asignarATarea }),
  ctrl.reemplazarEnTarea
);

module.exports = { rutasProyecto, rutasTarea };
