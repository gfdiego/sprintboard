// Pruebas que no necesitan base de datos
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { pool } = require('../src/lib/bd');
const { firmarAccessToken, firmarRefreshToken, verificarRefreshToken } = require('../src/middleware/autenticar');
const { diferencias } = require('../src/utils/historial');
const { limitarIntentos } = require('../src/middleware/limiteIntentos');
const { manejarErrores } = require('../src/middleware/errores');
const { HttpError } = require('../src/utils/errores');
const authEsquemas = require('../src/modulos/auth/auth.esquemas');
const tareasEsquemas = require('../src/modulos/tareas/tareas.esquemas');

afterAll(() => pool.end());

describe('Salud y rutas', () => {
  test('GET /api/salud responde ok', async () => {
    const res = await request(app).get('/api/salud');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ estado: 'ok' });
  });

  test('las rutas protegidas exigen token', async () => {
    const res = await request(app).get('/api/proyectos');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/token/i);
  });
});

describe('Autenticación con JWT', () => {
  test('rechaza un token firmado con otro secreto', async () => {
    const falso = jwt.sign({ correo: 'x@x.com' }, 'otro-secreto', { subject: '1' });
    const res = await request(app).get('/api/proyectos').set('Authorization', `Bearer ${falso}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token inválido');
  });

  test('rechaza un token vencido', async () => {
    const vencido = jwt.sign({ tipo: 'access', correo: 'x@x.com' }, process.env.JWT_ACCESS_SECRET, {
      subject: '1',
      expiresIn: -10,
    });
    const res = await request(app).get('/api/proyectos').set('Authorization', `Bearer ${vencido}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('El token expiró');
  });

  test('rechaza un token sin firma (alg none)', async () => {
    const sinFirma = jwt.sign({ correo: 'x@x.com' }, null, { subject: '1', algorithm: 'none' });
    const res = await request(app).get('/api/proyectos').set('Authorization', `Bearer ${sinFirma}`);
    expect(res.status).toBe(401);
  });

  test('firmarAccessToken guarda el id en "sub" y el tipo access', () => {
    const datos = jwt.decode(firmarAccessToken({ id: 7, correo: 'a@a.com', nombre: 'Ana' }));
    expect(datos.sub).toBe('7');
    expect(datos.tipo).toBe('access');
  });

  test('el access token dura 15 minutos y el refresh 1 día', () => {
    const access = jwt.decode(firmarAccessToken({ id: 7, correo: 'a@a.com', nombre: 'Ana' }));
    const refresh = jwt.decode(firmarRefreshToken(7).token);
    expect(access.exp - access.iat).toBe(15 * 60);
    expect(refresh.exp - refresh.iat).toBe(24 * 60 * 60);
  });

  test('un refresh token no sirve como token de acceso', async () => {
    const { token } = firmarRefreshToken(1);
    const res = await request(app).get('/api/proyectos').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  test('un access token con tipo distinto se rechaza aunque esté bien firmado', async () => {
    const otro = jwt.sign({ tipo: 'refresh' }, process.env.JWT_ACCESS_SECRET, { subject: '1' });
    const res = await request(app).get('/api/proyectos').set('Authorization', `Bearer ${otro}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token inválido');
  });

  test('verificarRefreshToken rechaza un access token', () => {
    const access = firmarAccessToken({ id: 1, correo: 'a@a.com', nombre: 'Ana' });
    expect(() => verificarRefreshToken(access)).toThrow(HttpError);
  });

  test('POST /api/auth/refresh sin cookie responde 401', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No hay sesión activa');
  });

  test('POST /api/auth/logout sin cookie responde 204 y borra la cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(204);
    expect(res.headers['set-cookie'][0]).toMatch(/^refreshToken=;/);
  });
});

describe('Protección CSRF y sesiones', () => {
  test('refresh desde un origen no permitido responde 403', async () => {
    const res = await request(app).post('/api/auth/refresh').set('Origin', 'https://malicioso.com');
    expect(res.status).toBe(403);
  });

  test('logout marcado como cross-site por el navegador responde 403', async () => {
    const res = await request(app).post('/api/auth/logout').set('Sec-Fetch-Site', 'cross-site');
    expect(res.status).toBe(403);
  });

  test('refresh desde el origen del frontend pasa la verificación', async () => {
    const res = await request(app).post('/api/auth/refresh').set('Origin', 'http://localhost:5173');
    expect(res.status).toBe(401); // llega al servicio: no hay cookie
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  test('las rutas de sesiones exigen access token', async () => {
    expect((await request(app).get('/api/auth/sesiones')).status).toBe(401);
    expect((await request(app).post('/api/auth/logout-todas')).status).toBe(401);
    expect((await request(app).delete('/api/auth/sesiones/abc')).status).toBe(401);
  });

  test('cerrar una sesión valida que el id sea un UUID', async () => {
    const token = firmarAccessToken({ id: 1, correo: 'a@a.com', nombre: 'Ana' });
    const res = await request(app).delete('/api/auth/sesiones/abc').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

describe('Validaciones', () => {
  test('registro exige contraseña con letras y números', () => {
    const r = authEsquemas.registro.safeParse({ nombre: 'Ana', correo: 'a@a.com', password: 'solotexto' });
    expect(r.success).toBe(false);
  });

  test('registro normaliza el correo', () => {
    const r = authEsquemas.registro.parse({ nombre: 'Ana', correo: '  ANA@Ejemplo.com ', password: 'Clave1234' });
    expect(r.correo).toBe('ana@ejemplo.com');
  });

  test('los puntos deben ser Fibonacci', () => {
    expect(tareasEsquemas.crear.safeParse({ titulo: 'x', puntos: 4 }).success).toBe(false);
    expect(tareasEsquemas.crear.safeParse({ titulo: 'x', puntos: 5 }).success).toBe(true);
  });

  test('filtros aceptan "yo", "ninguno" o un id', () => {
    expect(tareasEsquemas.filtros.parse({ asignado: 'yo' }).asignado).toBe('yo');
    expect(tareasEsquemas.filtros.parse({ asignado: '12' }).asignado).toBe(12);
    expect(tareasEsquemas.filtros.safeParse({ asignado: 'otro' }).success).toBe(false);
  });

  test('POST con JSON mal formado responde 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{mal json');
    expect(res.status).toBe(400);
  });

  test('registro con datos inválidos responde 400 con detalles', async () => {
    const res = await request(app).post('/api/auth/registro').send({ correo: 'no-es-correo' });
    expect(res.status).toBe(400);
    expect(res.body.detalles.map((d) => d.campo)).toEqual(expect.arrayContaining(['nombre', 'correo', 'password']));
  });
});

describe('Utilidades', () => {
  test('diferencias solo devuelve campos cambiados', () => {
    const d = diferencias({ titulo: 'A', puntos: 3, estado: 'por_hacer' }, { titulo: 'A', puntos: 5 });
    expect(d).toEqual({ puntos: { de: 3, a: 5 } });
  });

  test('limitarIntentos bloquea después del máximo', () => {
    const limite = limitarIntentos({ maximo: 2, ventanaMs: 60000 });
    const req = { ip: '1.1.1.1', body: { correo: 'a@a.com' } };
    const res = { on: () => {}, set: () => {} };
    const next = jest.fn();
    limite(req, res, next);
    limite(req, res, next);
    expect(() => limite(req, res, next)).toThrow(HttpError);
    expect(next).toHaveBeenCalledTimes(2);
  });

  test('limitarIntentos con soloFallidos=false cuenta también los éxitos', () => {
    const limite = limitarIntentos({ maximo: 2, ventanaMs: 60000, clave: (r) => r.ip, soloFallidos: false });
    const req = { ip: '2.2.2.2', body: {} };
    const res = { on: jest.fn(), set: () => {} };
    const next = jest.fn();
    limite(req, res, next);
    limite({ ...req, body: { correo: 'otro@a.com' } }, res, next);
    expect(() => limite(req, res, next)).toThrow(HttpError);
    expect(res.on).not.toHaveBeenCalled();
  });

  test('manejarErrores traduce errores de PostgreSQL', () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    manejarErrores({ code: '23505' }, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(409);
  });
});
