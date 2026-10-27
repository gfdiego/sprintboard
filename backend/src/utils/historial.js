/**
 * Registra un cambio de una tarea en la tabla historial.
 * `cambios` se guarda como JSONB, por ejemplo:
 *   { "estado": { "de": "por_hacer", "a": "en_progreso" } }
 */
async function registrar(cliente, { tareaId, usuarioId, accion, cambios = {} }) {
  await cliente.query(
    `INSERT INTO historial (tarea_id, usuario_id, accion, cambios)
     VALUES ($1, $2, $3, $4)`,
    [tareaId, usuarioId, accion, JSON.stringify(cambios)]
  );
}

/**
 * Compara dos objetos y devuelve { campo: { de, a } } solo con los campos que cambiaron.
 */
function diferencias(anterior, nuevo) {
  const cambios = {};
  for (const campo of Object.keys(nuevo)) {
    const de = normalizar(anterior[campo]);
    const a = normalizar(nuevo[campo]);
    if (de !== a) cambios[campo] = { de, a };
  }
  return cambios;
}

function normalizar(valor) {
  if (valor === undefined) return null;
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  return valor;
}

module.exports = { registrar, diferencias };
