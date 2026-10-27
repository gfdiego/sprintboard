const { Router } = require('express');
const { validar } = require('../../middleware/validar');
const { autenticar } = require('../../middleware/autenticar');
const { limitarIntentos } = require('../../middleware/limiteIntentos');
const { verificarOrigen } = require('../../middleware/verificarOrigen');
const esquemas = require('./auth.esquemas');
const ctrl = require('./auth.controlador');

const router = Router();
const MINUTO = 60 * 1000;
const limiteLogin = limitarIntentos({ maximo: 5, ventanaMs: 15 * MINUTO });
const limiteRefresh = limitarIntentos({ maximo: 20, ventanaMs: 15 * MINUTO });
// En el registro cuentan también los éxitos: frena la creación masiva de cuentas
// y que se use el 409 para averiguar qué correos están registrados.
const limiteRegistro = limitarIntentos({ maximo: 10, ventanaMs: 60 * MINUTO, clave: (req) => req.ip, soloFallidos: false });

router.post('/registro', limiteRegistro, validar({ body: esquemas.registro }), ctrl.registro);
router.post('/login', limiteLogin, validar({ body: esquemas.login }), ctrl.login);

// Actúan solo con la cookie: se verifica el origen contra CSRF
router.post('/refresh', verificarOrigen, limiteRefresh, ctrl.refrescar);
router.post('/logout', verificarOrigen, ctrl.logout);

// Requieren access token
router.get('/yo', autenticar, ctrl.yo);
router.get('/sesiones', autenticar, ctrl.sesiones);
router.delete('/sesiones/:id', autenticar, validar({ params: esquemas.paramSesion }), ctrl.cerrarSesion);
router.post('/logout-todas', autenticar, ctrl.logoutTodas);

// expuestos para reiniciarlos en las pruebas
router.limiteLogin = limiteLogin;
router.limiteRefresh = limiteRefresh;
router.limiteRegistro = limiteRegistro;

module.exports = router;
