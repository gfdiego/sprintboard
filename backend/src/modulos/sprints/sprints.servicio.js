const { consulta } = require('../../lib/bd');
const { transaccion } = require('../../lib/transaccion');
const { registrar } = require('../../utils/historial');
const { conflicto, noEncontrado, solicitudInvalida } = require('../../utils/errores');
const { SELECT_TAREA } = require('../tareas/tareas.servicio');

// Sprint con resumen de tareas y puntos
const SELECT_SPRINT = `
  SELECT s.*,
         COUNT(t.id)::int AS total_tareas,
         COUNT(t.id) FILTER (WHERE t.estado = 'hecho')::int AS tareas_hechas,
         COALESCE(SUM(t.puntos), 0)::int AS puntos_totales,
         COALESCE(SUM(t.puntos) FILTER (WHERE t.estado = 'hecho'), 0)::int AS puntos_hechos
  FROM sprints s
  LEFT JOIN tareas t ON t.sprint_id = s.id`;

async function listar(proyectoId) {
  const { rows } = await consulta(
    `${SELECT_SPRINT}
     WHERE s.proyecto_id = $1
     GROUP BY s.id
     ORDER BY CASE s.estado WHEN 'activo' THEN 0 WHEN 'planificado' THEN 1 ELSE 2 END, s.creado_en DESC`,
    [proyectoId]
  );
  return rows;
}

async function obtener(id, c = { query: consulta }) {
  const { rows } = await c.query(`${SELECT_SPRINT} WHERE s.id = $1 GROUP BY s.id`, [id]);
  if (!rows[0]) throw noEncontrado('Sprint no encontrado');
  return rows[0];
}

async function crear(proyectoId, datos) {
  let { nombre } = datos;
  if (!nombre) {
    const { rows } = await consulta('SELECT COUNT(*)::int AS n FROM sprints WHERE proyecto_id = $1', [proyectoId]);
    nombre = `Sprint ${rows[0].n + 1}`;
  }
  const { rows } = await consulta(
    `INSERT INTO sprints (proyecto_id, nombre, objetivo, fecha_inicio, fecha_fin)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [proyectoId, nombre, datos.objetivo ?? null, datos.fecha_inicio ?? null, datos.fecha_fin ?? null]
  );
  return obtener(rows[0].id);
}

async function bloquearSprint(c, id) {
  const { rows } = await c.query('SELECT * FROM sprints WHERE id = $1 FOR UPDATE', [id]);
  if (!rows[0]) throw noEncontrado('Sprint no encontrado');
  return rows[0];
}

async function actualizar(id, datos) {
  return transaccion(async (c) => {
    const sprint = await bloquearSprint(c, id);
    if (sprint.estado === 'cerrado') throw solicitudInvalida('No se puede editar un sprint cerrado');

    const campos = Object.keys(datos);
    const sets = campos.map((campo, i) => `${campo} = $${i + 2}`);
    await c.query(`UPDATE sprints SET ${sets.join(', ')} WHERE id = $1`, [id, ...campos.map((k) => datos[k])]);
    return obtener(id, c);
  });
}

async function iniciar(id, { fecha_fin }) {
  return transaccion(async (c) => {
    const sprint = await bloquearSprint(c, id);
    if (sprint.estado !== 'planificado') throw solicitudInvalida('Solo se puede iniciar un sprint planificado');

    const { rows: activos } = await c.query(
      `SELECT nombre FROM sprints WHERE proyecto_id = $1 AND estado = 'activo'`,
      [sprint.proyecto_id]
    );
    if (activos[0]) throw conflicto(`Ya hay un sprint activo (${activos[0].nombre}). Ciérralo primero.`);

    await c.query(
      `UPDATE sprints
       SET estado = 'activo',
           fecha_inicio = CURRENT_DATE,
           fecha_fin = COALESCE($2::date,
                                CASE WHEN fecha_fin >= CURRENT_DATE THEN fecha_fin END,
                                CURRENT_DATE + 13)
       WHERE id = $1`,
      [id, fecha_fin ?? null]
    );
    return obtener(id, c);
  });
}

/**
 * Cierra el sprint. Las tareas que no estén en "hecho" vuelven al backlog.
 */
async function cerrar(id, usuarioId) {
  return transaccion(async (c) => {
    const sprint = await bloquearSprint(c, id);
    if (sprint.estado !== 'activo') throw solicitudInvalida('Solo se puede cerrar el sprint activo');

    const { rows: pendientes } = await c.query(
      `UPDATE tareas SET sprint_id = NULL, actualizado_en = now()
       WHERE sprint_id = $1 AND estado <> 'hecho'
       RETURNING id`,
      [id]
    );
    for (const t of pendientes) {
      await registrar(c, {
        tareaId: t.id,
        usuarioId,
        accion: 'sprint',
        cambios: { sprint_id: { de: id, a: null }, motivo: 'sprint cerrado' },
      });
    }

    await c.query(
      `UPDATE sprints SET estado = 'cerrado', fecha_fin = LEAST(COALESCE(fecha_fin, CURRENT_DATE), CURRENT_DATE)
       WHERE id = $1`,
      [id]
    );

    const resumen = await obtener(id, c);
    return { ...resumen, tareas_devueltas_al_backlog: pendientes.length };
  });
}

async function eliminar(id) {
  const { rows } = await consulta('SELECT estado FROM sprints WHERE id = $1', [id]);
  if (!rows[0]) throw noEncontrado('Sprint no encontrado');
  if (rows[0].estado !== 'planificado') {
    throw solicitudInvalida('Solo se pueden eliminar sprints planificados');
  }
  // Las tareas vuelven al backlog por ON DELETE SET NULL
  await consulta('DELETE FROM sprints WHERE id = $1', [id]);
}

/**
 * Tablero Kanban: tareas del sprint agrupadas por estado.
 */
async function tablero(id) {
  const sprint = await obtener(id);
  const { rows } = await consulta(
    `${SELECT_TAREA} WHERE t.sprint_id = $1 ORDER BY t.orden, t.id`,
    [id]
  );
  const columnas = { por_hacer: [], en_progreso: [], en_revision: [], hecho: [] };
  for (const tarea of rows) columnas[tarea.estado].push(tarea);
  return { sprint, columnas };
}

module.exports = { listar, obtener, crear, actualizar, iniciar, cerrar, eliminar, tablero };
