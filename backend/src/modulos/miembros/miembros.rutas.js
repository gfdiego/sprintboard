const { Router } = require('express');
const { validar } = require('../../middleware/validar');
const { accesoProyecto } = require('../../middleware/miembroProyecto');
const esquemas = require('./miembros.esquemas');
const ctrl = require('./miembros.controlador');

// Montado en /api/proyectos/:pid/miembros
const router = Router({ mergeParams: true });

router.get('/', accesoProyecto('proyecto', 'observador'), ctrl.listar);
router.post('/', accesoProyecto('proyecto', 'admin'), validar({ body: esquemas.agregar }), ctrl.agregar);
router.patch(
  '/:uid',
  accesoProyecto('proyecto', 'admin'),
  validar({ params: esquemas.paramsMiembro, body: esquemas.actualizar }),
  ctrl.actualizar
);
router.delete(
  '/:uid',
  accesoProyecto('proyecto', 'observador'),
  validar({ params: esquemas.paramsMiembro }),
  ctrl.eliminar
);

module.exports = router;
