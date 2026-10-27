const { Router } = require('express');
const { validar } = require('../../middleware/validar');
const { accesoProyecto } = require('../../middleware/miembroProyecto');
const esquemas = require('./proyectos.esquemas');
const ctrl = require('./proyectos.controlador');

const router = Router();

router.get('/', ctrl.listar);
router.post('/', validar({ body: esquemas.crear }), ctrl.crear);

router.get('/:pid', accesoProyecto('proyecto', 'observador'), ctrl.obtener);
router.patch('/:pid', accesoProyecto('proyecto', 'admin'), validar({ body: esquemas.actualizar }), ctrl.actualizar);
router.delete('/:pid', accesoProyecto('proyecto', 'admin'), ctrl.eliminar);

module.exports = router;
