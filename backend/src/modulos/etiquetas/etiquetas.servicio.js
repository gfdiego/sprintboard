const { consulta } = require('../../lib/bd');
const { transaccion } = require('../../lib/transaccion');
const { registrar } = require('../../utils/historial');
const { conflicto, noEncontrado, solicitudInvalida } = require('../../utils/errores');

async function listar(proyectoId) {
  const { rows } = await consulta(
    `SELECT e.*, (SELECT COUNT(*)::int FROM tarea_etiquetas te WHERE te.etiqueta_id = e.id) AS total_tareas
     FROM etiquetas e WHERE e.proyecto_id = $1 ORDER BY e.nombre`,
    [proyectoId]
  );
  return rows;
}

async function crear(proyectoId, { nombre, color }) {
  try {
    const { rows } = await consulta(
      'INSERT INTO etiquetas (proyecto_id, nombre, color) VALUES ($1, $2, $3) RETURNING *',
      [proyectoId, nombre, color]
    );
    return rows[0];
  } catch (err) {
    if (err.code === '23505') throw conflicto(`Ya existe la etiqueta "${nombre}" en este proyecto`);
    throw err;
  }
}

async function eliminar(proyectoId, etiquetaId) {
  const { rowCount } = await consulta('DELETE FROM etiquetas WHERE id = $1 AND proyecto_id = $2', [
    etiquetaId,
    proyectoId,
  ]);
  if (!rowCount) throw noEncontrado('Etiqueta no encontrada');
}

/**
 * Reemplaza las etiquetas de una tarea por la lista recibida.
 */
async function reemplazarEnTarea(tareaId, proyectoId, usuarioId, etiquetas) {
  const ids = [...new Set(etiquetas)];
  return transaccion(async (c) => {
    if (ids.length) {
      const { rows } = await c.query(
        'SELECT COUNT(*)::int AS n FROM etiquetas WHERE proyecto_id = $1 AND id = ANY($2::int[])',
        [proyectoId, ids]
      );
      if (rows[0].n !== ids.length) throw solicitudInvalida('Alguna etiqueta no pertenece a este proyecto');
    }

    const { rows: antes } = await c.query(
      'SELECT etiqueta_id FROM tarea_etiquetas WHERE tarea_id = $1 ORDER BY etiqueta_id',
      [tareaId]
    );
    await c.query('DELETE FROM tarea_etiquetas WHERE tarea_id = $1', [tareaId]);
    if (ids.length) {
      await c.query(
        'INSERT INTO tarea_etiquetas (tarea_id, etiqueta_id) SELECT $1, unnest($2::int[])',
        [tareaId, ids]
      );
    }
    await registrar(c, {
      tareaId,
      usuarioId,
      accion: 'etiquetas',
      cambios: { etiquetas: { de: antes.map((r) => r.etiqueta_id), a: ids.sort((a, b) => a - b) } },
    });

    const { rows } = await c.query(
      `SELECT e.id, e.nombre, e.color FROM tarea_etiquetas te
       JOIN etiquetas e ON e.id = te.etiqueta_id WHERE te.tarea_id = $1 ORDER BY e.nombre`,
      [tareaId]
    );
    return rows;
  });
}

module.exports = { listar, crear, eliminar, reemplazarEnTarea };
