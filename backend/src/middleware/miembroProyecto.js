const { consulta } = require('../lib/bd');
const { solicitudInvalida, noEncontrado, prohibido } = require('../utils/errores');

const NIVEL_ROL = { observador: 1, miembro: 2, admin: 3 };

// Cómo encontrar el proyecto según el recurso de la ruta
const RESOLVEDORES = {
  proyecto: { param: 'pid', sql: 'SELECT id AS proyecto_id FROM proyectos WHERE id = $1' },
  tarea: { param: 'id', sql: 'SELECT proyecto_id FROM tareas WHERE id = $1' },
  sprint: { param: 'id', sql: 'SELECT proyecto_id FROM sprints WHERE id = $1' },
  comentario: {
    param: 'id',
    sql: `SELECT t.proyecto_id FROM comentarios c
          JOIN tareas t ON t.id = c.tarea_id WHERE c.id = $1`,
  },
};

/**
 * Verifica que el usuario autenticado sea miembro del proyecto
 * y que tenga al menos el rol indicado.
 *
 *   accesoProyecto('proyecto', 'observador')  -> /api/proyectos/:pid/...
 *   accesoProyecto('tarea', 'miembro')        -> /api/tareas/:id/...
 *
 * Deja req.proyectoId y req.rol disponibles para los controladores.
 * Si no es miembro responde 404 para no revelar que el recurso existe.
 */
function accesoProyecto(desde = 'proyecto', rolMinimo = 'observador') {
  const resolvedor = RESOLVEDORES[desde];
  if (!resolvedor) throw new Error(`Resolvedor desconocido: ${desde}`);

  return async (req, res, next) => {
    const id = Number(req.params[resolvedor.param]);
    if (!Number.isInteger(id) || id <= 0) {
      throw solicitudInvalida('Identificador inválido');
    }

    const { rows } = await consulta(
      `SELECT r.proyecto_id, m.rol
       FROM (${resolvedor.sql}) r
       LEFT JOIN miembros_proyecto m
         ON m.proyecto_id = r.proyecto_id AND m.usuario_id = $2`,
      [id, req.usuario.id]
    );

    const fila = rows[0];
    if (!fila || !fila.rol) throw noEncontrado();

    if (NIVEL_ROL[fila.rol] < NIVEL_ROL[rolMinimo]) {
      throw prohibido(`Se requiere rol ${rolMinimo} o superior en este proyecto`);
    }

    req.proyectoId = fila.proyecto_id;
    req.rol = fila.rol;
    next();
  };
}

module.exports = { accesoProyecto, NIVEL_ROL };
