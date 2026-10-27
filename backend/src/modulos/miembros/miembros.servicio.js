const { consulta } = require('../../lib/bd');
const { transaccion } = require('../../lib/transaccion');
const { conflicto, noEncontrado, solicitudInvalida } = require('../../utils/errores');

const SELECT_MIEMBRO = `
  SELECT u.id, u.nombre, u.correo, u.avatar_url, m.rol, m.capacidad_puntos, m.unido_en
  FROM miembros_proyecto m
  JOIN usuarios u ON u.id = m.usuario_id`;

async function listar(proyectoId) {
  const { rows } = await consulta(
    `${SELECT_MIEMBRO} WHERE m.proyecto_id = $1 ORDER BY m.rol, u.nombre`,
    [proyectoId]
  );
  return rows;
}

async function obtener(proyectoId, usuarioId) {
  const { rows } = await consulta(
    `${SELECT_MIEMBRO} WHERE m.proyecto_id = $1 AND m.usuario_id = $2`,
    [proyectoId, usuarioId]
  );
  if (!rows[0]) throw noEncontrado('El usuario no es miembro de este proyecto');
  return rows[0];
}

async function agregar(proyectoId, { correo, rol, capacidad_puntos }) {
  const { rows: usuarios } = await consulta('SELECT id FROM usuarios WHERE correo = $1', [correo]);
  if (!usuarios[0]) throw noEncontrado('No existe un usuario registrado con ese correo');

  try {
    await consulta(
      `INSERT INTO miembros_proyecto (proyecto_id, usuario_id, rol, capacidad_puntos)
       VALUES ($1, $2, $3, $4)`,
      [proyectoId, usuarios[0].id, rol, capacidad_puntos]
    );
  } catch (err) {
    if (err.code === '23505') throw conflicto('El usuario ya es miembro del proyecto');
    throw err;
  }
  return obtener(proyectoId, usuarios[0].id);
}

// Evita que un proyecto se quede sin ningún admin
async function verificarNoEsUltimoAdmin(c, proyectoId, usuarioId) {
  // Bloquea los miembros del proyecto para que dos cambios simultáneos no dejen 0 admins
  await c.query('SELECT 1 FROM miembros_proyecto WHERE proyecto_id = $1 FOR UPDATE', [proyectoId]);
  const { rows } = await c.query(
    `SELECT
       (SELECT rol FROM miembros_proyecto WHERE proyecto_id = $1 AND usuario_id = $2) AS rol,
       (SELECT COUNT(*)::int FROM miembros_proyecto WHERE proyecto_id = $1 AND rol = 'admin') AS admins`,
    [proyectoId, usuarioId]
  );
  const { rol, admins } = rows[0];
  if (!rol) throw noEncontrado('El usuario no es miembro de este proyecto');
  if (rol === 'admin' && admins <= 1) {
    throw solicitudInvalida('El proyecto debe tener al menos un admin');
  }
}

async function actualizar(proyectoId, usuarioId, datos) {
  await transaccion(async (c) => {
    if (datos.rol && datos.rol !== 'admin') {
      await verificarNoEsUltimoAdmin(c, proyectoId, usuarioId);
    }
    const campos = Object.keys(datos);
    const sets = campos.map((campo, i) => `${campo} = $${i + 3}`);
    const { rowCount } = await c.query(
      `UPDATE miembros_proyecto SET ${sets.join(', ')}
       WHERE proyecto_id = $1 AND usuario_id = $2`,
      [proyectoId, usuarioId, ...campos.map((k) => datos[k])]
    );
    if (!rowCount) throw noEncontrado('El usuario no es miembro de este proyecto');
  });
  return obtener(proyectoId, usuarioId);
}

async function eliminar(proyectoId, usuarioId) {
  await transaccion(async (c) => {
    await verificarNoEsUltimoAdmin(c, proyectoId, usuarioId);
    // Sus tareas abiertas en el proyecto quedan sin asignar
    await c.query(
      `UPDATE tareas SET asignado_id = NULL, actualizado_en = now()
       WHERE proyecto_id = $1 AND asignado_id = $2 AND estado <> 'hecho'`,
      [proyectoId, usuarioId]
    );
    await c.query('DELETE FROM miembros_proyecto WHERE proyecto_id = $1 AND usuario_id = $2', [
      proyectoId,
      usuarioId,
    ]);
  });
}

module.exports = { listar, obtener, agregar, actualizar, eliminar };
