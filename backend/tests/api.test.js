/**
 * Pruebas de integración contra PostgreSQL real.
 * Requieren DATABASE_URL_TEST en .env (por ejemplo, una rama "test" de Neon).
 * ¡ATENCIÓN! Borran y recrean todo el esquema de esa base de datos.
 */
const request = require('supertest');

const hayBd = Boolean(process.env.DATABASE_URL_TEST);
const describirSiHayBd = hayBd ? describe : describe.skip;

let app, pool, migrar, auth;

describirSiHayBd('API SprintBoard (integración)', () => {
  const tokens = {};
  const ids = {};

  const api = (quien) => ({
    get: (url) => request(app).get(url).set('Authorization', `Bearer ${tokens[quien]}`),
    post: (url, body) => request(app).post(url).set('Authorization', `Bearer ${tokens[quien]}`).send(body),
    patch: (url, body) => request(app).patch(url).set('Authorization', `Bearer ${tokens[quien]}`).send(body),
    put: (url, body) => request(app).put(url).set('Authorization', `Bearer ${tokens[quien]}`).send(body),
    delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${tokens[quien]}`),
  });

  beforeAll(async () => {
    app = require('../src/app');
    ({ pool } = require('../src/lib/bd'));
    ({ migrar } = require('../db/migrar'));
    auth = require('../src/modulos/auth/auth.rutas');

    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await migrar();

    for (const nombre of ['ana', 'luis', 'sofia', 'extrano']) {
      const res = await request(app)
        .post('/api/auth/registro')
        .send({ nombre, correo: `${nombre}@prueba.com`, password: 'Clave1234' });
      expect(res.status).toBe(201);
      tokens[nombre] = res.body.accessToken;
      ids[nombre] = res.body.usuario.id;
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  // ---------- Auth ----------
  describe('Autenticación', () => {
    test('no guarda la contraseña en texto plano', async () => {
      const { rows } = await pool.query("SELECT password_hash FROM usuarios WHERE correo = 'ana@prueba.com'");
      expect(rows[0].password_hash).not.toBe('Clave1234');
      expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);
    });

    test('no permite correos duplicados', async () => {
      const res = await request(app)
        .post('/api/auth/registro')
        .send({ nombre: 'Otra', correo: 'ANA@prueba.com', password: 'Clave1234' });
      expect(res.status).toBe(409);
    });

    test('login correcto devuelve access token y el refresh en una cookie httpOnly', async () => {
      const res = await request(app).post('/api/auth/login').send({ correo: 'ana@prueba.com', password: 'Clave1234' });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.refreshToken).toBeUndefined();
      expect(res.body.usuario.password_hash).toBeUndefined();
      const cookie = res.headers['set-cookie'][0];
      expect(cookie).toMatch(/^refreshToken=/);
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/SameSite=Strict/);
      expect(cookie).toMatch(/Path=\/api\/auth/);
    });

    test('login incorrecto responde 401 con mensaje genérico', async () => {
      const res = await request(app).post('/api/auth/login').send({ correo: 'ana@prueba.com', password: 'Mala1234' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Correo o contraseña incorrectos');
    });

    test('limita los intentos fallidos de login', async () => {
      auth.limiteLogin.reiniciar();
      const intento = () => request(app).post('/api/auth/login').send({ correo: 'luis@prueba.com', password: 'Mala1234' });
      for (let i = 0; i < 5; i++) expect((await intento()).status).toBe(401);
      expect((await intento()).status).toBe(429);
      auth.limiteLogin.reiniciar();
    });

    describe('Refresh token', () => {
      const login = () =>
        request(app).post('/api/auth/login').send({ correo: 'sofia@prueba.com', password: 'Clave1234' });
      const cookieDe = (res) => res.headers['set-cookie'][0].split(';')[0];
      const refrescar = (cookie) => request(app).post('/api/auth/refresh').set('Cookie', cookie);

      beforeEach(() => auth.limiteRefresh.reiniciar());

      test('rota el refresh y entrega un access token nuevo', async () => {
        const c1 = cookieDe(await login());
        const res = await refrescar(c1);
        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeTruthy();
        const c2 = cookieDe(res);
        expect(c2).not.toBe(c1);

        const yo = await request(app).get('/api/auth/yo').set('Authorization', `Bearer ${res.body.accessToken}`);
        expect(yo.body.correo).toBe('sofia@prueba.com');

        // Reuso inmediato (otra pestaña): 409 sin borrar la cookie ni cerrar las demás sesiones
        const reuso = await refrescar(c1);
        expect(reuso.status).toBe(409);
        expect(reuso.headers['set-cookie']).toBeUndefined();
        expect((await refrescar(c2)).status).toBe(200);
      });

      test('reusar un refresh robado cierra todas las sesiones del usuario', async () => {
        const c1 = cookieDe(await login());
        const c2 = cookieDe(await refrescar(c1));
        // Simula que el token viejo se rotó hace un minuto
        await pool.query("UPDATE refresh_tokens SET revocado_en = now() - interval '1 minute' WHERE reemplazado_por IS NOT NULL");

        const res = await refrescar(c1);
        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/cerraron todas tus sesiones/);
        expect((await refrescar(c2)).status).toBe(401);
      });

      test('logout revoca el refresh y borra la cookie', async () => {
        const c1 = cookieDe(await login());
        const res = await request(app).post('/api/auth/logout').set('Cookie', c1);
        expect(res.status).toBe(204);
        expect(res.headers['set-cookie'][0]).toMatch(/^refreshToken=;/);
        expect((await refrescar(c1)).status).toBe(401);
      });

      const verSesiones = (accessToken, cookie) =>
        request(app).get('/api/auth/sesiones').set('Authorization', `Bearer ${accessToken}`).set('Cookie', cookie);

      test('lista las sesiones abiertas y mantiene el id al rotar', async () => {
        const r1 = await login();
        const c1 = cookieDe(r1);
        const antes = (await verSesiones(r1.body.accessToken, c1)).body.find((s) => s.actual);
        expect(antes).toBeTruthy();

        const r2 = await refrescar(c1);
        const despues = (await verSesiones(r2.body.accessToken, cookieDe(r2))).body.find((s) => s.actual);
        expect(despues.id).toBe(antes.id);
      });

      test('cerrar una sesión por id la invalida y nadie más puede cerrarla', async () => {
        const r1 = await login();
        const c1 = cookieDe(r1);
        const actual = (await verSesiones(r1.body.accessToken, c1)).body.find((s) => s.actual);

        const ajena = await api('ana').delete(`/api/auth/sesiones/${actual.id}`);
        expect(ajena.status).toBe(404);

        const res = await request(app)
          .delete(`/api/auth/sesiones/${actual.id}`)
          .set('Authorization', `Bearer ${r1.body.accessToken}`)
          .set('Cookie', c1);
        expect(res.status).toBe(204);
        expect(res.headers['set-cookie'][0]).toMatch(/^refreshToken=;/);
        expect((await refrescar(c1)).status).toBe(401);
      });

      test('logout-todas cierra todos los dispositivos', async () => {
        const r1 = await login();
        const c1 = cookieDe(r1);
        const c2 = cookieDe(await login());
        const res = await request(app)
          .post('/api/auth/logout-todas')
          .set('Authorization', `Bearer ${r1.body.accessToken}`);
        expect(res.status).toBe(204);
        expect((await refrescar(c1)).status).toBe(401);
        expect((await refrescar(c2)).status).toBe(401);
      });

      test('el refresh token guardado en la BD no se puede usar como access token', async () => {
        const c1 = cookieDe(await login());
        const refresh = c1.split('=')[1];
        const res = await request(app).get('/api/auth/yo').set('Authorization', `Bearer ${refresh}`);
        expect(res.status).toBe(401);
      });
    });

    test('GET /api/auth/yo devuelve el usuario del token', async () => {
      const res = await api('ana').get('/api/auth/yo');
      expect(res.status).toBe(200);
      expect(res.body.correo).toBe('ana@prueba.com');
    });
  });

  // ---------- Proyectos y miembros ----------
  describe('Proyectos y miembros', () => {
    test('crear proyecto deja al creador como admin', async () => {
      const res = await api('ana').post('/api/proyectos', { clave: 'web', nombre: 'Sitio web' });
      expect(res.status).toBe(201);
      expect(res.body.clave).toBe('WEB');
      expect(res.body.rol).toBe('admin');
      ids.proyecto = res.body.id;
    });

    test('la clave del proyecto es única', async () => {
      const res = await api('luis').post('/api/proyectos', { clave: 'WEB', nombre: 'Otro' });
      expect(res.status).toBe(409);
    });

    test('quien no es miembro recibe 404', async () => {
      const res = await api('extrano').get(`/api/proyectos/${ids.proyecto}`);
      expect(res.status).toBe(404);
    });

    test('el admin agrega miembros por correo', async () => {
      const r1 = await api('ana').post(`/api/proyectos/${ids.proyecto}/miembros`, {
        correo: 'luis@prueba.com',
        capacidad_puntos: 5,
      });
      expect(r1.status).toBe(201);
      expect(r1.body.rol).toBe('miembro');

      const r2 = await api('ana').post(`/api/proyectos/${ids.proyecto}/miembros`, {
        correo: 'sofia@prueba.com',
        rol: 'observador',
      });
      expect(r2.status).toBe(201);
    });

    test('agregar un correo inexistente o repetido falla', async () => {
      const url = `/api/proyectos/${ids.proyecto}/miembros`;
      expect((await api('ana').post(url, { correo: 'nadie@prueba.com' })).status).toBe(404);
      expect((await api('ana').post(url, { correo: 'luis@prueba.com' })).status).toBe(409);
    });

    test('un miembro no puede agregar miembros', async () => {
      const res = await api('luis').post(`/api/proyectos/${ids.proyecto}/miembros`, { correo: 'extrano@prueba.com' });
      expect(res.status).toBe(403);
    });

    test('el proyecto aparece en la lista del nuevo miembro', async () => {
      const res = await api('luis').get('/api/proyectos');
      expect(res.body.map((p) => p.clave)).toContain('WEB');
    });

    test('no se puede dejar el proyecto sin admin', async () => {
      const res = await api('ana').patch(`/api/proyectos/${ids.proyecto}/miembros/${ids.ana}`, { rol: 'miembro' });
      expect(res.status).toBe(400);
    });
  });

  // ---------- Tareas ----------
  describe('Tareas', () => {
    test('crear sprint con nombre automático', async () => {
      const res = await api('ana').post(`/api/proyectos/${ids.proyecto}/sprints`, { objetivo: 'MVP' });
      expect(res.status).toBe(201);
      expect(res.body.nombre).toBe('Sprint 1');
      ids.sprint = res.body.id;
    });

    test('crear tarea genera la clave WEB-1 y registra historial', async () => {
      const res = await api('luis').post(`/api/proyectos/${ids.proyecto}/tareas`, {
        titulo: 'Login',
        tipo: 'historia',
        prioridad: 'alta',
        puntos: 3,
        asignado_id: ids.luis,
        sprint_id: ids.sprint,
      });
      expect(res.status).toBe(201);
      expect(res.body.clave).toBe('WEB-1');
      expect(res.body.asignado.nombre).toBe('luis');
      expect(res.body.reportador.id).toBe(ids.luis);
      ids.tarea1 = res.body.id;

      const hist = await api('luis').get(`/api/tareas/${ids.tarea1}/historial`);
      expect(hist.body[0].accion).toBe('creada');
    });

    test('rechaza puntos que no son Fibonacci', async () => {
      const res = await api('luis').post(`/api/proyectos/${ids.proyecto}/tareas`, { titulo: 'X', puntos: 4 });
      expect(res.status).toBe(400);
    });

    test('no se puede asignar a alguien que no es miembro', async () => {
      const res = await api('ana').patch(`/api/tareas/${ids.tarea1}/asignar`, { asignado_id: ids.extrano });
      expect(res.status).toBe(400);
    });

    test('el observador no puede crear tareas', async () => {
      const res = await api('sofia').post(`/api/proyectos/${ids.proyecto}/tareas`, { titulo: 'X' });
      expect(res.status).toBe(403);
    });

    test('asignar por encima de la capacidad devuelve advertencia', async () => {
      const { body: t2 } = await api('ana').post(`/api/proyectos/${ids.proyecto}/tareas`, {
        titulo: 'Registro',
        puntos: 5,
        sprint_id: ids.sprint,
      });
      expect(t2.clave).toBe('WEB-2');
      ids.tarea2 = t2.id;

      const res = await api('ana').patch(`/api/tareas/${ids.tarea2}/asignar`, { asignado_id: ids.luis });
      expect(res.status).toBe(200);
      expect(res.body.asignado_id).toBe(ids.luis);
      expect(res.body.advertencia).toMatch(/8 puntos/);
    });

    test('subtareas y épicas respetan la jerarquía', async () => {
      const url = `/api/proyectos/${ids.proyecto}/tareas`;
      expect((await api('ana').post(url, { titulo: 'Sub', tipo: 'subtarea' })).status).toBe(400);

      const epica = await api('ana').post(url, { titulo: 'Autenticación', tipo: 'epica' });
      ids.epica = epica.body.id;

      const hija = await api('ana').patch(`/api/tareas/${ids.tarea1}`, { padre_id: ids.epica });
      expect(hija.status).toBe(200);
      expect(hija.body.padre.titulo).toBe('Autenticación');

      const sub = await api('ana').post(url, { titulo: 'Validar formulario', tipo: 'subtarea', padre_id: ids.tarea1 });
      expect(sub.status).toBe(201);
      ids.subtarea = sub.body.id;

      // Una subtarea no puede tener hijas
      expect((await api('ana').post(url, { titulo: 'Y', tipo: 'subtarea', padre_id: ids.subtarea })).status).toBe(400);

      // La épica suma los puntos de sus hijas
      const e = await api('ana').get(`/api/tareas/${ids.epica}`);
      expect(e.body.puntos_hijas).toBe(3);
    });

    test('no permite ciclos padre/hija', async () => {
      const url = `/api/proyectos/${ids.proyecto}/tareas`;
      const a = await api('ana').post(url, { titulo: 'A' });
      const b = await api('ana').post(url, { titulo: 'B', padre_id: a.body.id });
      const res = await api('ana').patch(`/api/tareas/${a.body.id}`, { padre_id: b.body.id });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/ciclo/);
    });

    test('editar registra solo los cambios en el historial', async () => {
      const res = await api('luis').patch(`/api/tareas/${ids.tarea1}`, { titulo: 'Login con correo', puntos: 3 });
      expect(res.status).toBe(200);
      const hist = await api('luis').get(`/api/tareas/${ids.tarea1}/historial`);
      expect(hist.body[0].cambios).toEqual({ titulo: { de: 'Login', a: 'Login con correo' } });
    });

    test('mover la tarea cambia el estado y queda en el historial', async () => {
      const res = await api('luis').patch(`/api/tareas/${ids.tarea1}/mover`, { estado: 'hecho', orden: 0 });
      expect(res.status).toBe(200);
      expect(res.body.estado).toBe('hecho');
      const hist = await api('luis').get(`/api/tareas/${ids.tarea1}/historial`);
      expect(hist.body[0].cambios.estado).toEqual({ de: 'por_hacer', a: 'hecho' });
    });

    test('filtros de tareas', async () => {
      const base = `/api/proyectos/${ids.proyecto}/tareas`;
      const mias = await api('luis').get(`${base}?asignado=yo`);
      expect(mias.body.map((t) => t.clave).sort()).toEqual(['WEB-1', 'WEB-2']);

      const busqueda = await api('luis').get(`${base}?q=web-2`);
      expect(busqueda.body).toHaveLength(1);

      expect((await api('luis').get(`${base}?estado=raro`)).status).toBe(400);
    });

    test('backlog muestra tareas sin sprint ni subtareas', async () => {
      const res = await api('sofia').get(`/api/proyectos/${ids.proyecto}/backlog`);
      expect(res.status).toBe(200);
      const tipos = res.body.tareas.map((t) => t.tipo);
      expect(tipos).not.toContain('subtarea');
      expect(res.body.tareas.every((t) => t.sprint_id === null)).toBe(true);
    });

    test('solo el creador o un admin puede eliminar una tarea', async () => {
      const res = await api('luis').delete(`/api/tareas/${ids.epica}`);
      expect(res.status).toBe(403);
    });
  });

  // ---------- Comentarios y etiquetas ----------
  describe('Comentarios y etiquetas', () => {
    test('comentar, editar solo el autor, eliminar el admin', async () => {
      const c = await api('luis').post(`/api/tareas/${ids.tarea1}/comentarios`, { contenido: 'Listo para revisar' });
      expect(c.status).toBe(201);
      expect(c.body.autor.nombre).toBe('luis');

      expect((await api('ana').patch(`/api/comentarios/${c.body.id}`, { contenido: 'x' })).status).toBe(403);
      expect((await api('sofia').post(`/api/tareas/${ids.tarea1}/comentarios`, { contenido: 'x' })).status).toBe(403);
      expect((await api('ana').delete(`/api/comentarios/${c.body.id}`)).status).toBe(204);
    });

    test('etiquetas por proyecto', async () => {
      const e = await api('ana').post(`/api/proyectos/${ids.proyecto}/etiquetas`, { nombre: 'Frontend', color: '#3b82f6' });
      expect(e.status).toBe(201);
      expect(e.body.nombre).toBe('frontend');

      const otro = await api('extrano').post('/api/proyectos', { clave: 'OTRO', nombre: 'Otro' });
      const ajena = await api('extrano').post(`/api/proyectos/${otro.body.id}/etiquetas`, { nombre: 'ajena' });

      const ok = await api('luis').put(`/api/tareas/${ids.tarea1}/etiquetas`, { etiquetas: [e.body.id] });
      expect(ok.status).toBe(200);
      expect(ok.body[0].nombre).toBe('frontend');

      const mal = await api('luis').put(`/api/tareas/${ids.tarea1}/etiquetas`, { etiquetas: [ajena.body.id] });
      expect(mal.status).toBe(400);
    });
  });

  // ---------- Sprints y reportes ----------
  describe('Sprints y reportes', () => {
    test('tablero agrupa por estado', async () => {
      const res = await api('sofia').get(`/api/sprints/${ids.sprint}/tablero`);
      expect(res.status).toBe(200);
      expect(res.body.columnas.hecho.map((t) => t.clave)).toEqual(['WEB-1']);
      expect(res.body.columnas.por_hacer.map((t) => t.clave)).toEqual(['WEB-2']);
    });

    test('iniciar sprint y no permitir dos activos', async () => {
      const r1 = await api('ana').post(`/api/sprints/${ids.sprint}/iniciar`, {});
      expect(r1.status).toBe(200);
      expect(r1.body.estado).toBe('activo');

      const s2 = await api('ana').post(`/api/proyectos/${ids.proyecto}/sprints`, {});
      ids.sprint2 = s2.body.id;
      const r2 = await api('ana').post(`/api/sprints/${ids.sprint2}/iniciar`, {});
      expect(r2.status).toBe(409);
    });

    test('un miembro no puede iniciar ni cerrar sprints', async () => {
      expect((await api('luis').post(`/api/sprints/${ids.sprint}/cerrar`, {})).status).toBe(403);
    });

    test('reporte de carga marca al miembro sobrecargado', async () => {
      const res = await api('ana').get(`/api/proyectos/${ids.proyecto}/reportes/carga`);
      expect(res.status).toBe(200);
      const luis = res.body.miembros.find((m) => m.id === ids.luis);
      expect(luis.puntos_asignados).toBe(8);
      expect(luis.puntos_hechos).toBe(3);
      expect(luis.sobrecargado).toBe(true);
    });

    test('burndown descuenta lo terminado hoy', async () => {
      const res = await api('ana').get(`/api/sprints/${ids.sprint}/reportes/burndown`);
      expect(res.status).toBe(200);
      expect(res.body.puntos_totales).toBe(8);
      expect(res.body.dias[0].restante).toBe(5);
      expect(res.body.dias[0].ideal).toBe(8);
    });

    test('cerrar sprint devuelve lo pendiente al backlog', async () => {
      const res = await api('ana').post(`/api/sprints/${ids.sprint}/cerrar`, {});
      expect(res.status).toBe(200);
      expect(res.body.estado).toBe('cerrado');
      expect(res.body.tareas_devueltas_al_backlog).toBe(1);

      const t2 = await api('ana').get(`/api/tareas/${ids.tarea2}`);
      expect(t2.body.sprint_id).toBeNull();

      const vel = await api('ana').get(`/api/proyectos/${ids.proyecto}/reportes/velocidad`);
      expect(vel.body.sprints[0].puntos_completados).toBe(3);
    });

    test('no se pueden agregar tareas a un sprint cerrado', async () => {
      const res = await api('ana').patch(`/api/tareas/${ids.tarea2}`, { sprint_id: ids.sprint });
      expect(res.status).toBe(400);
    });
  });

  // ---------- Salida de miembros ----------
  describe('Salida de miembros', () => {
    test('un miembro puede salir y sus tareas abiertas quedan sin asignar', async () => {
      const res = await api('luis').delete(`/api/proyectos/${ids.proyecto}/miembros/${ids.luis}`);
      expect(res.status).toBe(204);

      const t2 = await api('ana').get(`/api/tareas/${ids.tarea2}`);
      expect(t2.body.asignado_id).toBeNull();

      const t1 = await api('ana').get(`/api/tareas/${ids.tarea1}`);
      expect(t1.body.asignado_id).toBe(ids.luis); // las terminadas conservan el responsable

      expect((await api('luis').get(`/api/proyectos/${ids.proyecto}`)).status).toBe(404);
    });

    test('un observador no puede quitar a otros', async () => {
      const res = await api('sofia').delete(`/api/proyectos/${ids.proyecto}/miembros/${ids.ana}`);
      expect(res.status).toBe(403);
    });
  });
});

if (!hayBd) {
  test.skip('Pruebas de integración omitidas: define DATABASE_URL_TEST para ejecutarlas', () => {});
}
