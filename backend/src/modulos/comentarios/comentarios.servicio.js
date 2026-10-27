const { consulta } = require('../../lib/bd');
const { noEncontrado, prohibido } = require('../../utils/errores');

const SELECT_COMENTARIO = `
  SELECT c.id, c.tarea_id, c.contenido, c.creado_en, c.actualizado_en,
         json_build_object('id', u.id, 'nombre', u.nombre, 'avatar_url', u.avatar_url) AS autor
  FROM comentarios c JOIN usuarios u ON u.id = c.autor_id`;

async function listar(tareaId) {
  const { rows } = await consulta(`${SELECT_COMENTARIO} WHERE c.tarea_id = $1 ORDER BY c.creado_en, c.id`, [tareaId]);
  return rows;
}

async function obtener(id) {
  const { rows } = await consulta(`${SELECT_COMENTARIO} WHERE c.id = $1`, [id]);
  if (!rows[0]) throw noEncontrado('Comentario no encontrado');
  return rows[0];
}

async function crear(tareaId, autorId, contenido) {
  const { rows } = await consulta(
    'INSERT INTO comentarios (tarea_id, autor_id, contenido) VALUES ($1, $2, $3) RETURNING id',
    [tareaId, autorId, contenido]
  );
  return obtener(rows[0].id);
}

async function autorDe(id) {
  const { rows } = await consulta('SELECT autor_id FROM comentarios WHERE id = $1', [id]);
  if (!rows[0]) throw noEncontrado('Comentario no encontrado');
  return rows[0].autor_id;
}

async function editar(id, usuarioId, contenido) {
  if ((await autorDe(id)) !== usuarioId) throw prohibido('Solo el autor puede editar el comentario');
  await consulta('UPDATE comentarios SET contenido = $2, actualizado_en = now() WHERE id = $1', [id, contenido]);
  return obtener(id);
}

async function eliminar(id, usuarioId, rol) {
  if ((await autorDe(id)) !== usuarioId && rol !== 'admin') {
    throw prohibido('Solo el autor o un admin puede eliminar el comentario');
  }
  await consulta('DELETE FROM comentarios WHERE id = $1', [id]);
}

module.exports = { listar, crear, editar, eliminar };
