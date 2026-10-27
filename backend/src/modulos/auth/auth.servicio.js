const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const env = require('../../config/env');
const { consulta } = require('../../lib/bd');
const { transaccion } = require('../../lib/transaccion');
const { firmarAccessToken, firmarRefreshToken, verificarRefreshToken } = require('../../middleware/autenticar');
const { conflicto, noAutorizado, noEncontrado } = require('../../utils/errores');

const CAMPOS_PUBLICOS = 'id, nombre, correo, avatar_url, creado_en';

// Hash falso para comparar cuando el correo no existe y responder en un tiempo similar
const HASH_FALSO = bcrypt.hashSync('contraseña-inexistente', 10);

// Si un refresh ya rotado se reusa dentro de este margen se rechaza sin cerrar
// todas las sesiones (dos pestañas que refrescan a la vez). Fuera del margen
// se considera robado.
const MARGEN_REUSO_MS = 10 * 1000;

/**
 * Guarda un refresh token nuevo en la BD y devuelve ambos tokens.
 * `contexto` = { ip, agente } de la petición.
 * `sesion` = { id, inicio }: al rotar se conserva la de antes; si no, empieza una nueva.
 */
async function emitirTokens(usuario, contexto, cliente = { query: consulta }, sesion = null) {
  const { id: sesionId, inicio } = sesion || { id: crypto.randomUUID(), inicio: new Date() };
  const refresh = firmarRefreshToken(usuario.id);
  await cliente.query(
    `INSERT INTO refresh_tokens (id, usuario_id, sesion_id, sesion_inicio, expira_en, ip, agente)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [refresh.jti, usuario.id, sesionId, inicio, refresh.expiraEn, contexto.ip, contexto.agente]
  );
  return {
    accessToken: firmarAccessToken(usuario),
    refreshToken: refresh.token,
    refreshExpira: refresh.expiraEn,
    jti: refresh.jti,
  };
}

async function registrar({ nombre, correo, password }, contexto) {
  const passwordHash = await bcrypt.hash(password, env.bcryptRondas);
  let usuario;
  try {
    const { rows } = await consulta(
      `INSERT INTO usuarios (nombre, correo, password_hash)
       VALUES ($1, $2, $3) RETURNING ${CAMPOS_PUBLICOS}`,
      [nombre, correo, passwordHash]
    );
    usuario = rows[0];
  } catch (err) {
    if (err.code === '23505') throw conflicto('Ya existe una cuenta con ese correo');
    throw err;
  }
  return { usuario, ...(await emitirTokens(usuario, contexto)) };
}

async function iniciarSesion({ correo, password }, contexto) {
  const { rows } = await consulta(
    `SELECT ${CAMPOS_PUBLICOS}, password_hash FROM usuarios WHERE correo = $1`,
    [correo]
  );
  const fila = rows[0];
  const valida = await bcrypt.compare(password, fila ? fila.password_hash : HASH_FALSO);

  if (!fila || !valida) throw noAutorizado('Correo o contraseña incorrectos');

  const { password_hash, ...usuario } = fila;
  return { usuario, ...(await emitirTokens(usuario, contexto)) };
}

/**
 * Cambia un refresh token válido por un par nuevo (rotación).
 * El token usado queda revocado; si alguien lo vuelve a usar se cierran
 * todas las sesiones del usuario.
 */
async function refrescar(refreshToken, contexto) {
  if (!refreshToken) throw noAutorizado('No hay sesión activa');
  const { usuarioId, jti } = verificarRefreshToken(refreshToken);

  const resultado = await transaccion(async (cliente) => {
    const { rows } = await cliente.query(
      `SELECT usuario_id, sesion_id, sesion_inicio, revocado_en, reemplazado_por, expira_en
       FROM refresh_tokens WHERE id = $1 FOR UPDATE`,
      [jti]
    );
    const sesion = rows[0];
    if (!sesion || sesion.usuario_id !== usuarioId) return { error: 'Sesión inválida' };

    if (sesion.revocado_en) {
      const reusoRapido = Date.now() - sesion.revocado_en.getTime() < MARGEN_REUSO_MS;
      if (sesion.reemplazado_por && !reusoRapido) {
        await cliente.query(
          'UPDATE refresh_tokens SET revocado_en = now() WHERE usuario_id = $1 AND revocado_en IS NULL',
          [usuarioId]
        );
        return { error: 'Sesión inválida. Por seguridad se cerraron todas tus sesiones' };
      }
      // Otra pestaña acaba de rotar este token: el navegador ya tiene la cookie nueva
      if (sesion.reemplazado_por) return { error: 'La sesión se acaba de renovar. Reintenta', estado: 409 };
      return { error: 'La sesión ya no es válida' };
    }

    if (sesion.expira_en.getTime() <= Date.now()) return { error: 'La sesión expiró' };

    const usuarios = await cliente.query(`SELECT ${CAMPOS_PUBLICOS} FROM usuarios WHERE id = $1`, [usuarioId]);
    const usuario = usuarios.rows[0];
    if (!usuario) return { error: 'Sesión inválida' };

    const tokens = await emitirTokens(usuario, contexto, cliente, {
      id: sesion.sesion_id,
      inicio: sesion.sesion_inicio,
    });
    await cliente.query(
      'UPDATE refresh_tokens SET revocado_en = now(), reemplazado_por = $2 WHERE id = $1',
      [jti, tokens.jti]
    );
    return { usuario, ...tokens };
  });

  // El error se lanza fuera de la transacción para que la revocación quede guardada
  if (resultado.estado === 409) throw conflicto(resultado.error);
  if (resultado.error) throw noAutorizado(resultado.error);
  return resultado;
}

/** Revoca la sesión del refresh token. No falla si el token ya no sirve. */
async function cerrarSesion(refreshToken) {
  const jti = jtiDe(refreshToken);
  if (!jti) return;
  await consulta('UPDATE refresh_tokens SET revocado_en = now() WHERE id = $1 AND revocado_en IS NULL', [jti]);
}

/** jti del refresh token de la cookie, o null si no sirve. */
function jtiDe(refreshToken) {
  if (!refreshToken) return null;
  try {
    return verificarRefreshToken(refreshToken).jti;
  } catch {
    return null;
  }
}

/** Sesiones abiertas del usuario (una por dispositivo), marcando la actual. */
async function listarSesiones(usuarioId, refreshToken) {
  const { rows } = await consulta(
    `SELECT sesion_id AS id, sesion_inicio AS iniciada_en, creado_en AS ultima_actividad,
            expira_en, ip, agente, (id = $2) AS actual
     FROM refresh_tokens
     WHERE usuario_id = $1 AND revocado_en IS NULL AND expira_en > now()
     ORDER BY creado_en DESC`,
    [usuarioId, jtiDe(refreshToken)]
  );
  return rows;
}

/** Cierra una sesión concreta. Devuelve true si era la sesión de esta cookie. */
async function cerrarSesionPorId(usuarioId, sesionId, refreshToken) {
  const { rows } = await consulta(
    `UPDATE refresh_tokens SET revocado_en = now()
     WHERE usuario_id = $1 AND sesion_id = $2 AND revocado_en IS NULL
     RETURNING id`,
    [usuarioId, sesionId]
  );
  if (!rows.length) throw noEncontrado('Sesión no encontrada');
  return rows.some((r) => r.id === jtiDe(refreshToken));
}

/** Cierra todas las sesiones del usuario (todos los dispositivos). */
async function cerrarTodasLasSesiones(usuarioId) {
  await consulta(
    'UPDATE refresh_tokens SET revocado_en = now() WHERE usuario_id = $1 AND revocado_en IS NULL',
    [usuarioId]
  );
}

/** Borra tokens vencidos o revocados hace más de un día. Se ejecuta cada hora (server.js). */
async function limpiarSesiones() {
  const { rowCount } = await consulta(
    `DELETE FROM refresh_tokens
     WHERE expira_en < now() OR revocado_en < now() - interval '1 day'`
  );
  return rowCount;
}

async function obtenerUsuario(id) {
  const { rows } = await consulta(`SELECT ${CAMPOS_PUBLICOS} FROM usuarios WHERE id = $1`, [id]);
  if (!rows[0]) throw noEncontrado('Usuario no encontrado');
  return rows[0];
}

module.exports = {
  registrar,
  iniciarSesion,
  refrescar,
  cerrarSesion,
  listarSesiones,
  cerrarSesionPorId,
  cerrarTodasLasSesiones,
  limpiarSesiones,
  obtenerUsuario,
};
