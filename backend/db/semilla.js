/**
 * Carga datos de demostración. SOLO para desarrollo.
 * Uso: npm run db:semilla
 *
 * Usuarios creados (contraseña: Demo12345):
 *   ana@ejemplo.com (admin), luis@ejemplo.com, sofia@ejemplo.com
 */
const bcrypt = require('bcryptjs');
const env = require('../src/config/env');
const { pool } = require('../src/lib/bd');
const { transaccion } = require('../src/lib/transaccion');

const PASSWORD_DEMO = 'Demo12345';

async function sembrar() {
  if (env.entorno === 'production') {
    throw new Error('La semilla no se puede ejecutar en producción');
  }

  await transaccion(async (c) => {
    const { rows: existe } = await c.query("SELECT 1 FROM usuarios WHERE correo = 'ana@ejemplo.com'");
    if (existe.length) {
      console.log('Los datos de demo ya existen. Nada que hacer.');
      return;
    }

    const hash = await bcrypt.hash(PASSWORD_DEMO, env.bcryptRondas);
    const { rows: usuarios } = await c.query(
      `INSERT INTO usuarios (nombre, correo, password_hash) VALUES
         ('Ana Pérez', 'ana@ejemplo.com', $1),
         ('Luis Gómez', 'luis@ejemplo.com', $1),
         ('Sofía Ramírez', 'sofia@ejemplo.com', $1)
       RETURNING id`,
      [hash]
    );
    const [ana, luis, sofia] = usuarios.map((u) => u.id);

    const { rows: [proyecto] } = await c.query(
      `INSERT INTO proyectos (clave, nombre, descripcion, propietario_id)
       VALUES ('WEB', 'Sitio web corporativo', 'Rediseño del sitio web', $1) RETURNING id`,
      [ana]
    );
    const pid = proyecto.id;

    await c.query(
      `INSERT INTO miembros_proyecto (proyecto_id, usuario_id, rol, capacidad_puntos) VALUES
         ($1, $2, 'admin', 13), ($1, $3, 'miembro', 10), ($1, $4, 'miembro', 8)`,
      [pid, ana, luis, sofia]
    );

    const { rows: [sprint] } = await c.query(
      `INSERT INTO sprints (proyecto_id, nombre, objetivo, estado, fecha_inicio, fecha_fin)
       VALUES ($1, 'Sprint 1', 'Primera versión de la página de inicio', 'activo',
               CURRENT_DATE, CURRENT_DATE + 13) RETURNING id`,
      [pid]
    );

    const { rows: etiquetas } = await c.query(
      `INSERT INTO etiquetas (proyecto_id, nombre, color) VALUES
         ($1, 'frontend', '#3b82f6'), ($1, 'backend', '#10b981'), ($1, 'diseño', '#f59e0b')
       RETURNING id`,
      [pid]
    );

    const tareas = [
      ['Diseñar maqueta de la página de inicio', 'historia', 'alta', 'hecho', 5, sofia, sprint.id, 2],
      ['Configurar API de contacto', 'tarea', 'media', 'en_progreso', 3, luis, sprint.id, 1],
      ['Formulario de contacto', 'historia', 'alta', 'por_hacer', 8, ana, sprint.id, 0],
      ['El menú no se ve en móviles', 'bug', 'critica', 'en_revision', 2, sofia, sprint.id, 2],
      ['Blog con artículos', 'epica', 'baja', 'por_hacer', null, null, null, 0],
      ['Optimizar imágenes', 'tarea', 'minima', 'por_hacer', 1, null, null, 0],
    ];

    let numero = 0;
    for (const [titulo, tipo, prio, estado, puntos, asignado, sprintId, etiqueta] of tareas) {
      numero++;
      const { rows: [t] } = await c.query(
        `INSERT INTO tareas (proyecto_id, numero, titulo, tipo, prioridad, estado, puntos,
                             asignado_id, reportador_id, sprint_id, orden)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [pid, numero, titulo, tipo, prio, estado, puntos, asignado, ana, sprintId, numero]
      );
      await c.query('INSERT INTO tarea_etiquetas (tarea_id, etiqueta_id) VALUES ($1, $2)', [t.id, etiquetas[etiqueta].id]);
      await c.query(
        `INSERT INTO historial (tarea_id, usuario_id, accion, cambios) VALUES ($1, $2, 'creada', $3)`,
        [t.id, ana, JSON.stringify({ titulo })]
      );
      if (estado === 'hecho') {
        await c.query(
          `INSERT INTO historial (tarea_id, usuario_id, accion, cambios) VALUES ($1, $2, 'estado', $3)`,
          [t.id, asignado, JSON.stringify({ estado: { de: 'en_progreso', a: 'hecho' } })]
        );
      }
    }
    await c.query('UPDATE proyectos SET contador_tareas = $2 WHERE id = $1', [pid, numero]);

    console.log('✔ Datos de demo cargados. Inicia sesión con ana@ejemplo.com / Demo12345');
  });
}

sembrar()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
