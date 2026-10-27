/**
 * Cliente HTTP de la API.
 * - El access token vive en sessionStorage (dura lo que la pestaña).
 * - El refresh token vive en una cookie httpOnly: este código nunca lo ve,
 *   el navegador lo envía solo gracias a `credentials: 'include'`.
 * - Si una petición responde 401 se renueva el access token y se reintenta una vez.
 */
const API = import.meta.env.VITE_API_URL || '/api';
const CLAVE_TOKEN = 'accessToken';

export class ErrorApi extends Error {
  constructor(estado, mensaje, detalles) {
    super(mensaje);
    this.estado = estado;
    this.detalles = detalles;
  }

  /** Convierte los detalles de validación del backend en { campo: mensaje }. */
  get erroresPorCampo() {
    return Object.fromEntries((this.detalles || []).map((d) => [d.campo, d.mensaje]));
  }
}

// sessionStorage puede fallar (modo privado, almacenamiento bloqueado)
export const token = {
  obtener() {
    try {
      return sessionStorage.getItem(CLAVE_TOKEN);
    } catch {
      return null;
    }
  },
  guardar(valor) {
    try {
      sessionStorage.setItem(CLAVE_TOKEN, valor);
    } catch {
      /* sin almacenamiento: la sesión dura hasta recargar */
    }
  },
  borrar() {
    try {
      sessionStorage.removeItem(CLAVE_TOKEN);
    } catch {
      /* nada que borrar */
    }
  },
};

// Avisa a las demás pestañas cuando se cierra la sesión
const canal = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('sprintboard-auth') : null;
const oyentesCierre = new Set();

/** Registra una función que se llama cuando la sesión termina (expiró o se cerró en otra pestaña). */
export function alTerminarSesion(fn) {
  oyentesCierre.add(fn);
  return () => oyentesCierre.delete(fn);
}

function terminarSesion({ avisarPestanas = false } = {}) {
  token.borrar();
  oyentesCierre.forEach((fn) => fn());
  if (avisarPestanas) canal?.postMessage('logout');
}

canal?.addEventListener('message', (e) => {
  if (e.data === 'logout') terminarSesion();
});

export function cerrarSesionLocal() {
  terminarSesion({ avisarPestanas: true });
}

async function solicitar(ruta, opciones) {
  try {
    return await fetch(`${API}${ruta}`, { credentials: 'include', ...opciones });
  } catch {
    throw new ErrorApi(0, 'No se pudo conectar con el servidor. Revisa que el backend esté encendido.');
  }
}

async function leer(res) {
  if (res.status === 204) return null;
  const esJson = (res.headers.get('content-type') || '').includes('application/json');
  const datos = esJson ? await res.json() : null;
  if (!res.ok) throw new ErrorApi(res.status, datos?.error || `Error ${res.status}`, datos?.detalles);
  return datos;
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let refrescando = null;

/**
 * Pide un access token nuevo usando la cookie. Varias llamadas a la vez comparten
 * la misma petición. Si otra pestaña acaba de renovar (409) se reintenta.
 * Devuelve el usuario.
 */
export function refrescar() {
  refrescando ??= (async () => {
    for (let intento = 0; intento < 3; intento++) {
      const res = await solicitar('/auth/refresh', { method: 'POST' });
      if (res.status === 409) {
        await esperar(300);
        continue;
      }
      const { usuario, accessToken } = await leer(res);
      token.guardar(accessToken);
      return usuario;
    }
    throw new ErrorApi(401, 'No se pudo renovar la sesión');
  })().finally(() => {
    refrescando = null;
  });
  return refrescando;
}

/**
 * Hace una petición a la API.
 *   api('/proyectos')
 *   api('/proyectos', { metodo: 'POST', cuerpo: { clave, nombre } })
 * `auth: false` para rutas públicas (no envía token ni intenta renovar).
 */
export async function api(ruta, { metodo = 'GET', cuerpo, auth = true } = {}) {
  const pedir = () => {
    const headers = {};
    if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
    const actual = auth && token.obtener();
    if (actual) headers.Authorization = `Bearer ${actual}`;
    return solicitar(ruta, {
      method: metodo,
      headers,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  };

  let res = await pedir();

  if (res.status === 401 && auth) {
    try {
      await refrescar();
    } catch {
      terminarSesion();
      throw new ErrorApi(401, 'Tu sesión expiró. Inicia sesión de nuevo.');
    }
    res = await pedir();
  }

  return leer(res);
}
