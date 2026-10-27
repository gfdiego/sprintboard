const { consulta } = require('../../lib/bd');
const { transaccion } = require('../../lib/transaccion');
const { conflicto, noEncontrado } = require('../../utils/errores');

async function listarDeUsuario(usuarioId) {
  const { rows } = await consulta(
    `SELECT p.id, p.clave, p.nombre, p.descripcion, p.propietario_id, p.creado_en,
            m.rol,
            (SELECT COUNT(*)::int FROM miembros_proyecto mp WHERE mp.proyecto_id = p.id) AS total_miembros,
            (SELECT COUNT(*)::int FROM tareas t WHERE t.proyecto_id = p.id AND t.estado <> 'hecho') AS tareas_abiertas
     FROM proyectos p
     JOIN miembros_proyecto m ON m.proyecto_id = p.id AND m.usuario_id = $1
     ORDER BY p.creado_en DESC`,
    [usuarioId]
  );
  return rows;
}

async function crear(usuarioId, { clave, nombre, descripcion }) {
  return transaccion(async (c) => {
    try {
      const { rows } = await c.query(
        `INSERT INTO proyectos (clave, nombre, descripcion, propietario_id)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [clave, nombre, descripcion ?? null, usuarioId]
      );
      const proyecto = rows[0];
      // Quien crea el proyecto queda como admin
      await c.query(
        `INSERT INTO miembros_proyecto (proyecto_id, usuario_id, rol) VALUES ($1, $2, 'admin')`,
        [proyecto.id, usuarioId]
      );
      return { ...proyecto, rol: 'admin' };
    } catch (err) {
      if (err.code === '23505') throw conflicto(`La clave ${clave} ya está en uso`);
      throw err;
    }
  });
}

async function obtener(proyectoId) {
  const { rows } = await consulta(
    `SELECT p.*,
            (SELECT row_to_json(s) FROM (
               SELECT id, nombre, objetivo, fecha_inicio, fecha_fin
               FROM sprints WHERE proyecto_id = p.id AND estado = 'activo'
             ) s) AS sprint_activo
     FROM proyectos p WHERE p.id = $1`,
    [proyectoId]
  );
  if (!rows[0]) throw noEncontrado('Proyecto no encontrado');
  return rows[0];
}

async function actualizar(proyectoId, datos) {
  const campos = Object.keys(datos);
  const sets = campos.map((campo, i) => `${campo} = $${i + 2}`);
  const { rows } = await consulta(
    `UPDATE proyectos SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    [proyectoId, ...campos.map((c) => datos[c])]
  );
  return rows[0];
}

async function eliminar(proyectoId) {
  await consulta('DELETE FROM proyectos WHERE id = $1', [proyectoId]);
}

module.exports = { listarDeUsuario, crear, obtener, actualizar, eliminar };
