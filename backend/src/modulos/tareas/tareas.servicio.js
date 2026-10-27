const { consulta } = require('../../lib/bd');
const { transaccion } = require('../../lib/transaccion');
const { registrar, diferencias } = require('../../utils/historial');
const { noEncontrado, prohibido, solicitudInvalida } = require('../../utils/errores');

// Consulta base: tarea con su clave (WEB-12), asignado, reportador y etiquetas
const SELECT_TAREA = `
  SELECT t.id, t.proyecto_id, p.clave || '-' || t.numero AS clave, t.numero,
         t.titulo, t.descripcion, t.tipo, t.prioridad, t.estado, t.puntos,
         t.asignado_id, t.reportador_id, t.sprint_id, t.padre_id,
         t.fecha_limite, t.orden, t.creado_en, t.actualizado_en,
         CASE WHEN a.id IS NULL THEN NULL
              ELSE json_build_object('id', a.id, 'nombre', a.nombre, 'avatar_url', a.avatar_url)
         END AS asignado,
         json_build_object('id', r.id, 'nombre', r.nombre) AS reportador,
         COALESCE((
           SELECT json_agg(json_build_object('id', e.id, 'nombre', e.nombre, 'color', e.color) ORDER BY e.nombre)
           FROM tarea_etiquetas te JOIN etiquetas e ON e.id = te.etiqueta_id
           WHERE te.tarea_id = t.id
         ), '[]'::json) AS etiquetas,
         (SELECT COUNT(*)::int FROM comentarios co WHERE co.tarea_id = t.id) AS total_comentarios,
         (SELECT COUNT(*)::int FROM tareas h WHERE h.padre_id = t.id) AS total_hijas
  FROM tareas t
  JOIN proyectos p ON p.id = t.proyecto_id
  JOIN usuarios r ON r.id = t.reportador_id
  LEFT JOIN usuarios a ON a.id = t.asignado_id`;

const CAMPOS_EDITABLES = ['titulo', 'descripcion', 'tipo', 'prioridad', 'puntos', 'sprint_id', 'padre_id', 'fecha_limite'];

const ejecutor = (c) => c || { query: consulta };

// ---------- Validaciones de relaciones ----------

async function validarAsignado(c, proyectoId, usuarioId) {
  if (usuarioId == null) return;
  const { rows } = await c.query(
    'SELECT 1 FROM miembros_proyecto WHERE proyecto_id = $1 AND usuario_id = $2',
    [proyectoId, usuarioId]
  );
  if (!rows[0]) throw solicitudInvalida('El usuario asignado no es miembro del proyecto');
}

async function validarSprint(c, proyectoId, sprintId) {
  if (sprintId == null) return;
  const { rows } = await c.query('SELECT estado FROM sprints WHERE id = $1 AND proyecto_id = $2', [sprintId, proyectoId]);
  if (!rows[0]) throw solicitudInvalida('El sprint no pertenece a este proyecto');
  if (rows[0].estado === 'cerrado') throw solicitudInvalida('No se pueden agregar tareas a un sprint cerrado');
}

async function validarPadre(c, proyectoId, padreId, tareaId) {
  if (padreId == null) return;
  const { rows } = await c.query('SELECT tipo FROM tareas WHERE id = $1 AND proyecto_id = $2', [padreId, proyectoId]);
  if (!rows[0]) throw solicitudInvalida('La tarea padre no pertenece a este proyecto');
  if (rows[0].tipo === 'subtarea') throw solicitudInvalida('Una subtarea no puede tener tareas hijas');

  if (tareaId) {
    // Evita ciclos: la tarea no puede ser ancestro de su nuevo padre
    const { rows: ciclo } = await c.query(
      `WITH RECURSIVE ancestros AS (
         SELECT id, padre_id FROM tareas WHERE id = $1
         UNION ALL
         SELECT t.id, t.padre_id FROM tareas t JOIN ancestros a ON t.id = a.padre_id
       )
       SELECT 1 FROM ancestros WHERE id = $2 LIMIT 1`,
      [padreId, tareaId]
    );
    if (ciclo[0]) throw solicitudInvalida('Esa relación padre/hija crearía un ciclo');
  }
}

function validarJerarquia({ tipo, padre_id }) {
  if (tipo === 'subtarea' && padre_id == null) throw solicitudInvalida('Una subtarea necesita una tarea padre');
  if (tipo === 'epica' && padre_id != null) throw solicitudInvalida('Una épica no puede tener tarea padre');
}

async function siguienteOrden(c, proyectoId, sprintId, estado, excluirId = 0) {
  const { rows } = await c.query(
    `SELECT COALESCE(MAX(orden), 0) + 1 AS siguiente FROM tareas
     WHERE proyecto_id = $1 AND sprint_id IS NOT DISTINCT FROM $2::int AND estado = $3 AND id <> $4`,
    [proyectoId, sprintId, estado, excluirId]
  );
  return rows[0].siguiente;
}

async function bloquearTarea(c, id) {
  const { rows } = await c.query('SELECT * FROM tareas WHERE id = $1 FOR UPDATE', [id]);
  if (!rows[0]) throw noEncontrado('Tarea no encontrada');
  return rows[0];
}

// ---------- Consultas ----------

async function listar(proyectoId, filtros, usuarioId) {
  const condiciones = ['t.proyecto_id = $1'];
  const parametros = [proyectoId];
  const agregar = (sql, valor) => {
    parametros.push(valor);
    condiciones.push(sql.replace('?', `$${parametros.length}`));
  };

  if (filtros.asignado === 'yo') agregar('t.asignado_id = ?', usuarioId);
  else if (filtros.asignado === 'ninguno') condiciones.push('t.asignado_id IS NULL');
  else if (filtros.asignado) agregar('t.asignado_id = ?', filtros.asignado);

  if (filtros.sprint === 'backlog') condiciones.push('t.sprint_id IS NULL');
  else if (filtros.sprint) agregar('t.sprint_id = ?', filtros.sprint);

  if (filtros.estado) agregar('t.estado = ?', filtros.estado);
  if (filtros.tipo) agregar('t.tipo = ?', filtros.tipo);
  if (filtros.prioridad) agregar('t.prioridad = ?', filtros.prioridad);
  if (filtros.q) {
    parametros.push(`%${filtros.q}%`);
    const n = parametros.length;
    condiciones.push(`(t.titulo ILIKE $${n} OR (p.clave || '-' || t.numero) ILIKE $${n})`);
  }

  const { rows } = await consulta(
    `${SELECT_TAREA} WHERE ${condiciones.join(' AND ')} ORDER BY t.prioridad DESC, t.creado_en DESC LIMIT 500`,
    parametros
  );
  return rows;
}

async function backlog(proyectoId) {
  const { rows } = await consulta(
    `${SELECT_TAREA}
     WHERE t.proyecto_id = $1 AND t.sprint_id IS NULL AND t.estado <> 'hecho' AND t.tipo <> 'subtarea'
     ORDER BY t.orden, t.prioridad DESC, t.id`,
    [proyectoId]
  );
  return {
    tareas: rows,
    puntos_totales: rows.reduce((suma, t) => suma + (t.puntos || 0), 0),
    sin_estimar: rows.filter((t) => t.puntos == null && t.tipo !== 'epica').length,
  };
}

async function obtener(id, c) {
  const db = ejecutor(c);
  const { rows } = await db.query(`${SELECT_TAREA} WHERE t.id = $1`, [id]);
  const tarea = rows[0];
  if (!tarea) throw noEncontrado('Tarea no encontrada');

  const { rows: hijas } = await db.query(`${SELECT_TAREA} WHERE t.padre_id = $1 ORDER BY t.numero`, [id]);
  tarea.hijas = hijas;
  // Las épicas suman los puntos de sus hijas
  tarea.puntos_hijas = hijas.reduce((suma, h) => suma + (h.puntos || 0), 0);

  if (tarea.padre_id) {
    const { rows: padre } = await db.query(
      `SELECT t.id, p.clave || '-' || t.numero AS clave, t.titulo, t.tipo
       FROM tareas t JOIN proyectos p ON p.id = t.proyecto_id WHERE t.id = $1`,
      [tarea.padre_id]
    );
    tarea.padre = padre[0] || null;
  } else {
    tarea.padre = null;
  }
  return tarea;
}

async function historial(id) {
  const { rows } = await consulta(
    `SELECT h.id, h.accion, h.cambios, h.creado_en,
            CASE WHEN u.id IS NULL THEN NULL ELSE json_build_object('id', u.id, 'nombre', u.nombre) END AS usuario
     FROM historial h LEFT JOIN usuarios u ON u.id = h.usuario_id
     WHERE h.tarea_id = $1
     ORDER BY h.creado_en DESC, h.id DESC`,
    [id]
  );
  return rows;
}

// ---------- Escritura ----------

async function crear(proyectoId, usuarioId, datos) {
  return transaccion(async (c) => {
    const tipo = datos.tipo;
    const padreId = datos.padre_id ?? null;
    const sprintId = datos.sprint_id ?? null;

    validarJerarquia({ tipo, padre_id: padreId });
    await validarAsignado(c, proyectoId, datos.asignado_id);
    await validarSprint(c, proyectoId, sprintId);
    await validarPadre(c, proyectoId, padreId);

    // Número correlativo por proyecto (WEB-1, WEB-2...). El UPDATE bloquea la fila
    // del proyecto, así dos tareas creadas a la vez no reciben el mismo número.
    const { rows: [proyecto] } = await c.query(
      'UPDATE proyectos SET contador_tareas = contador_tareas + 1 WHERE id = $1 RETURNING contador_tareas',
      [proyectoId]
    );
    const orden = await siguienteOrden(c, proyectoId, sprintId, 'por_hacer');

    const { rows: [nueva] } = await c.query(
      `INSERT INTO tareas (proyecto_id, numero, titulo, descripcion, tipo, prioridad, puntos,
                           asignado_id, reportador_id, sprint_id, padre_id, fecha_limite, orden)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [
        proyectoId, proyecto.contador_tareas, datos.titulo, datos.descripcion ?? null, tipo, datos.prioridad,
        datos.puntos ?? null, datos.asignado_id ?? null, usuarioId, sprintId, padreId, datos.fecha_limite ?? null, orden,
      ]
    );

    if (datos.etiquetas?.length) {
      const { rowCount } = await c.query(
        `INSERT INTO tarea_etiquetas (tarea_id, etiqueta_id)
         SELECT $1, e.id FROM etiquetas e WHERE e.proyecto_id = $2 AND e.id = ANY($3::int[])`,
        [nueva.id, proyectoId, [...new Set(datos.etiquetas)]]
      );
      if (rowCount !== new Set(datos.etiquetas).size) {
        throw solicitudInvalida('Alguna etiqueta no pertenece a este proyecto');
      }
    }

    await registrar(c, {
      tareaId: nueva.id,
      usuarioId,
      accion: 'creada',
      cambios: { titulo: datos.titulo, tipo, puntos: datos.puntos ?? null, asignado_id: datos.asignado_id ?? null },
    });

    return obtener(nueva.id, c);
  });
}

async function actualizar(id, usuarioId, cambios) {
  return transaccion(async (c) => {
    const actual = await bloquearTarea(c, id);
    const final = { ...actual, ...cambios };

    validarJerarquia(final);
    if ('sprint_id' in cambios && cambios.sprint_id !== actual.sprint_id) {
      await validarSprint(c, actual.proyecto_id, cambios.sprint_id);
    }
    if ('padre_id' in cambios && cambios.padre_id !== actual.padre_id) {
      await validarPadre(c, actual.proyecto_id, cambios.padre_id, id);
    }
    if (cambios.tipo === 'subtarea' && actual.tipo !== 'subtarea') {
      const { rows } = await c.query('SELECT 1 FROM tareas WHERE padre_id = $1 LIMIT 1', [id]);
      if (rows[0]) throw solicitudInvalida('Una tarea con hijas no puede convertirse en subtarea');
    }

    const diff = diferencias(actual, cambios);
    if (!Object.keys(diff).length) return obtener(id, c);

    const campos = CAMPOS_EDITABLES.filter((k) => k in diff);
    const valores = campos.map((k) => cambios[k]);

    // Si cambia de sprint, la tarea va al final de su columna en el nuevo sprint
    if ('sprint_id' in diff) {
      campos.push('orden');
      valores.push(await siguienteOrden(c, actual.proyecto_id, cambios.sprint_id, actual.estado, id));
    }

    const sets = campos.map((campo, i) => `${campo} = $${i + 2}`);
    await c.query(`UPDATE tareas SET ${sets.join(', ')}, actualizado_en = now() WHERE id = $1`, [id, ...valores]);

    await registrar(c, { tareaId: id, usuarioId, accion: 'editada', cambios: diff });
    return obtener(id, c);
  });
}

async function asignar(id, usuarioId, asignadoId) {
  return transaccion(async (c) => {
    const actual = await bloquearTarea(c, id);
    await validarAsignado(c, actual.proyecto_id, asignadoId);

    if (actual.asignado_id !== asignadoId) {
      await c.query('UPDATE tareas SET asignado_id = $2, actualizado_en = now() WHERE id = $1', [id, asignadoId]);
      await registrar(c, {
        tareaId: id,
        usuarioId,
        accion: 'asignada',
        cambios: { asignado_id: { de: actual.asignado_id, a: asignadoId } },
      });
    }

    const tarea = await obtener(id, c);
    tarea.advertencia = await revisarCapacidad(c, actual.proyecto_id, actual.sprint_id, asignadoId);
    return tarea;
  });
}

/**
 * Devuelve un texto de advertencia si el miembro supera su capacidad
 * de puntos en el sprint. No bloquea la asignación.
 */
async function revisarCapacidad(c, proyectoId, sprintId, usuarioId) {
  if (!sprintId || !usuarioId) return null;
  const { rows } = await c.query(
    `SELECT m.capacidad_puntos,
            COALESCE((SELECT SUM(puntos) FROM tareas
                      WHERE sprint_id = $2 AND asignado_id = $3), 0)::int AS asignados
     FROM miembros_proyecto m WHERE m.proyecto_id = $1 AND m.usuario_id = $3`,
    [proyectoId, sprintId, usuarioId]
  );
  const fila = rows[0];
  if (fila && fila.asignados > fila.capacidad_puntos) {
    return `El miembro tiene ${fila.asignados} puntos asignados en este sprint y su capacidad es ${fila.capacidad_puntos}`;
  }
  return null;
}

/**
 * Mueve la tarea en el tablero: cambia de columna (estado) y/o de posición (orden).
 */
async function mover(id, usuarioId, { estado, orden }) {
  return transaccion(async (c) => {
    const actual = await bloquearTarea(c, id);
    const destino = estado ?? actual.estado;

    let nuevoOrden = orden;
    if (nuevoOrden === undefined) {
      nuevoOrden = await siguienteOrden(c, actual.proyecto_id, actual.sprint_id, destino, id);
    } else {
      // Abre espacio en la columna destino
      await c.query(
        `UPDATE tareas SET orden = orden + 1
         WHERE proyecto_id = $1 AND sprint_id IS NOT DISTINCT FROM $2::int AND estado = $3
           AND orden >= $4 AND id <> $5`,
        [actual.proyecto_id, actual.sprint_id, destino, nuevoOrden, id]
      );
    }

    await c.query(
      'UPDATE tareas SET estado = $2, orden = $3, actualizado_en = now() WHERE id = $1',
      [id, destino, nuevoOrden]
    );

    if (destino !== actual.estado) {
      await registrar(c, {
        tareaId: id,
        usuarioId,
        accion: 'estado',
        cambios: { estado: { de: actual.estado, a: destino } },
      });
    }
    return obtener(id, c);
  });
}

async function eliminar(id, usuario, rol) {
  await transaccion(async (c) => {
    const actual = await bloquearTarea(c, id);
    if (rol !== 'admin' && actual.reportador_id !== usuario.id) {
      throw prohibido('Solo quien creó la tarea o un admin puede eliminarla');
    }
    // Las historias de una épica se conservan; solo se borran las subtareas
    await c.query(`UPDATE tareas SET padre_id = NULL WHERE padre_id = $1 AND tipo <> 'subtarea'`, [id]);
    await c.query('DELETE FROM tareas WHERE id = $1', [id]);
  });
}

module.exports = {
  SELECT_TAREA,
  listar,
  backlog,
  obtener,
  historial,
  crear,
  actualizar,
  asignar,
  mover,
  eliminar,
};
