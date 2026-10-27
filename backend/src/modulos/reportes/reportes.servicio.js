const { consulta } = require('../../lib/bd');
const { noEncontrado, solicitudInvalida } = require('../../utils/errores');

/**
 * Carga de trabajo por miembro: puntos asignados frente a su capacidad.
 * Usa el sprint indicado, o el activo. Si no hay sprint, toma las tareas abiertas del proyecto.
 */
async function carga(proyectoId, sprintId) {
  let sprint = null;
  if (sprintId) {
    const { rows } = await consulta('SELECT id, nombre, estado FROM sprints WHERE id = $1 AND proyecto_id = $2', [
      sprintId,
      proyectoId,
    ]);
    if (!rows[0]) throw noEncontrado('Sprint no encontrado en este proyecto');
    sprint = rows[0];
  } else {
    const { rows } = await consulta(
      `SELECT id, nombre, estado FROM sprints WHERE proyecto_id = $1 AND estado = 'activo'`,
      [proyectoId]
    );
    sprint = rows[0] || null;
  }

  const filtroTareas = sprint
    ? 't.proyecto_id = $1 AND t.sprint_id = $2'
    : `t.proyecto_id = $1 AND t.estado <> 'hecho' AND $2::int IS NULL`;
  const parametros = [proyectoId, sprint ? sprint.id : null];

  const { rows: miembros } = await consulta(
    `SELECT u.id, u.nombre, u.avatar_url, m.rol, m.capacidad_puntos,
            COUNT(t.id)::int AS tareas,
            COALESCE(SUM(t.puntos), 0)::int AS puntos_asignados,
            COALESCE(SUM(t.puntos) FILTER (WHERE t.estado = 'hecho'), 0)::int AS puntos_hechos
     FROM miembros_proyecto m
     JOIN usuarios u ON u.id = m.usuario_id
     LEFT JOIN tareas t ON t.asignado_id = u.id AND ${filtroTareas}
     WHERE m.proyecto_id = $1
     GROUP BY u.id, m.rol, m.capacidad_puntos
     ORDER BY u.nombre`,
    parametros
  );

  const { rows: [sinAsignar] } = await consulta(
    `SELECT COUNT(*)::int AS tareas, COALESCE(SUM(t.puntos), 0)::int AS puntos
     FROM tareas t WHERE t.asignado_id IS NULL AND ${filtroTareas}`,
    parametros
  );

  return {
    sprint,
    miembros: miembros.map((m) => ({
      ...m,
      porcentaje_capacidad: m.capacidad_puntos ? Math.round((m.puntos_asignados / m.capacidad_puntos) * 100) : null,
      sobrecargado: m.puntos_asignados > m.capacidad_puntos,
    })),
    sin_asignar: sinAsignar,
  };
}

/**
 * Velocidad: puntos completados en cada sprint cerrado (últimos 10).
 */
async function velocidad(proyectoId) {
  const { rows } = await consulta(
    `SELECT s.id, s.nombre, s.fecha_inicio, s.fecha_fin,
            COALESCE(SUM(t.puntos) FILTER (WHERE t.estado = 'hecho'), 0)::int AS puntos_completados,
            COUNT(t.id) FILTER (WHERE t.estado = 'hecho')::int AS tareas_completadas
     FROM sprints s
     LEFT JOIN tareas t ON t.sprint_id = s.id
     WHERE s.proyecto_id = $1 AND s.estado = 'cerrado'
     GROUP BY s.id
     ORDER BY s.fecha_fin DESC NULLS LAST, s.id DESC
     LIMIT 10`,
    [proyectoId]
  );
  const sprints = rows.reverse();
  const promedio = sprints.length
    ? Math.round(sprints.reduce((suma, s) => suma + s.puntos_completados, 0) / sprints.length)
    : 0;
  return { sprints, promedio };
}

/**
 * Burndown: puntos pendientes al final de cada día del sprint, más la línea ideal.
 * Un día cuenta una tarea como terminada cuando el historial registra su paso a "hecho".
 */
async function burndown(sprintId) {
  const { rows: [sprint] } = await consulta(
    'SELECT id, nombre, estado, fecha_inicio, fecha_fin FROM sprints WHERE id = $1',
    [sprintId]
  );
  if (!sprint) throw noEncontrado('Sprint no encontrado');
  if (!sprint.fecha_inicio) throw solicitudInvalida('El sprint aún no ha iniciado');

  const { rows } = await consulta(
    `WITH s AS (
       SELECT fecha_inicio, COALESCE(fecha_fin, fecha_inicio + 13) AS fecha_fin FROM sprints WHERE id = $1
     ),
     t AS (
       SELECT COALESCE(t.puntos, 0) AS puntos,
              CASE WHEN t.estado = 'hecho' THEN COALESCE(
                (SELECT MAX(h.creado_en)::date FROM historial h
                 WHERE h.tarea_id = t.id AND h.accion = 'estado' AND h.cambios -> 'estado' ->> 'a' = 'hecho'),
                t.actualizado_en::date)
              END AS fecha_hecho
       FROM tareas t WHERE t.sprint_id = $1
     )
     SELECT d::date AS fecha,
            d::date > CURRENT_DATE AS futuro,
            (SELECT COALESCE(SUM(puntos), 0) FROM t)
              - (SELECT COALESCE(SUM(puntos), 0) FROM t WHERE fecha_hecho <= d::date) AS restante
     FROM s, generate_series(s.fecha_inicio, s.fecha_fin, interval '1 day') AS d
     ORDER BY d`,
    [sprintId]
  );

  const { rows: [totales] } = await consulta(
    'SELECT COALESCE(SUM(puntos), 0)::int AS total FROM tareas WHERE sprint_id = $1',
    [sprintId]
  );
  const puntosTotales = totales.total;
  const pasos = Math.max(rows.length - 1, 1);

  return {
    sprint,
    puntos_totales: puntosTotales,
    dias: rows.map((r, i) => ({
      fecha: r.fecha,
      restante: r.futuro ? null : Number(r.restante),
      ideal: Math.round((puntosTotales - (puntosTotales * i) / pasos) * 10) / 10,
    })),
  };
}

module.exports = { carga, velocidad, burndown };
