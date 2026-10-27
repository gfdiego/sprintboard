const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const env = require('./config/env');
const { autenticar } = require('./middleware/autenticar');
const { rutaNoEncontrada, manejarErrores } = require('./middleware/errores');

const auth = require('./modulos/auth/auth.rutas');
const proyectos = require('./modulos/proyectos/proyectos.rutas');
const miembros = require('./modulos/miembros/miembros.rutas');
const sprints = require('./modulos/sprints/sprints.rutas');
const tareas = require('./modulos/tareas/tareas.rutas');
const comentarios = require('./modulos/comentarios/comentarios.rutas');
const etiquetas = require('./modulos/etiquetas/etiquetas.rutas');
const reportes = require('./modulos/reportes/reportes.rutas');

const app = express();

app.disable('x-powered-by');
// Detrás de un proxy (Render, Nginx…) req.ip sería la del proxy y el límite
// de intentos bloquearía a todos a la vez. Se configura con TRUST_PROXY.
app.set('trust proxy', env.trustProxy);
app.use(helmet());
// credentials: true permite que el navegador envíe y reciba la cookie del refresh token
app.use(cors({ origin: env.corsOrigen, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/api/salud', (req, res) => res.json({ estado: 'ok' }));
app.get('/api', (req, res) =>
  res.json({
    nombre: 'SprintBoard API',
    estado: 'ok',
    publicas: [
      'GET /api/salud',
      'POST /api/auth/registro',
      'POST /api/auth/login',
      'POST /api/auth/refresh',
      'POST /api/auth/logout',
    ],
    nota: 'Las demás rutas requieren el header Authorization: Bearer <accessToken> (obtenlo con /api/auth/login y renuévalo con /api/auth/refresh)',
  })
);

// Rutas públicas
app.use('/api/auth', auth);

// A partir de aquí todo requiere token
app.use('/api', autenticar);

// Rutas anidadas en un proyecto: /api/proyectos/:pid/...
app.use('/api/proyectos', proyectos);
app.use('/api/proyectos/:pid/miembros', miembros);
app.use('/api/proyectos/:pid/sprints', sprints.rutasProyecto);
app.use('/api/proyectos/:pid/tareas', tareas.rutasProyecto);
app.use('/api/proyectos/:pid/backlog', tareas.rutasBacklog);
app.use('/api/proyectos/:pid/etiquetas', etiquetas.rutasProyecto);
app.use('/api/proyectos/:pid/reportes', reportes.rutasProyecto);

// Rutas sobre un recurso concreto
app.use('/api/sprints', sprints.rutasSprint);
app.use('/api/sprints', reportes.rutasSprint);
app.use('/api/tareas', tareas.rutasTarea);
app.use('/api/tareas', comentarios.rutasTarea);
app.use('/api/tareas', etiquetas.rutasTarea);
app.use('/api/comentarios', comentarios.rutasComentario);

app.use(rutaNoEncontrada);
app.use(manejarErrores);

module.exports = app;
