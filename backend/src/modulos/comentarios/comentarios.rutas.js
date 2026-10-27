const { Router } = require('express');
const { validar } = require('../../middleware/validar');
const { accesoProyecto } = require('../../middleware/miembroProyecto');
const { paramId } = require('../../utils/esquemas');
const esquemas = require('./comentarios.esquemas');
const ctrl = require('./comentarios.controlador');

// /api/tareas/:id/comentarios
const rutasTarea = Router();
rutasTarea.get('/:id/comentarios', accesoProyecto('tarea', 'observador'), validar({ params: paramId }), ctrl.listar);
rutasTarea.post(
  '/:id/comentarios',
  accesoProyecto('tarea', 'miembro'),
  validar({ params: paramId, body: esquemas.crear }),
  ctrl.crear
);

// /api/comentarios/:id
const rutasComentario = Router();
rutasComentario.patch(
  '/:id',
  accesoProyecto('comentario', 'miembro'),
  validar({ params: paramId, body: esquemas.editar }),
  ctrl.editar
);
rutasComentario.delete('/:id', accesoProyecto('comentario', 'miembro'), validar({ params: paramId }), ctrl.eliminar);

module.exports = { rutasTarea, rutasComentario };
