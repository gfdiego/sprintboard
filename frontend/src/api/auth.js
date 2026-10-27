import { api, token, cerrarSesionLocal } from './cliente';

export async function login(correo, password) {
  const { usuario, accessToken } = await api('/auth/login', {
    metodo: 'POST',
    cuerpo: { correo, password },
    auth: false,
  });
  token.guardar(accessToken);
  return usuario;
}

export async function registro(nombre, correo, password) {
  const { usuario, accessToken } = await api('/auth/registro', {
    metodo: 'POST',
    cuerpo: { nombre, correo, password },
    auth: false,
  });
  token.guardar(accessToken);
  return usuario;
}

export async function logout() {
  try {
    await api('/auth/logout', { metodo: 'POST', auth: false });
  } finally {
    // Aunque el servidor falle, la sesión local se cierra igual
    cerrarSesionLocal();
  }
}

export const yo = () => api('/auth/yo');

export const listarSesiones = () => api('/auth/sesiones');

export const cerrarSesionDispositivo = (id) => api(`/auth/sesiones/${id}`, { metodo: 'DELETE' });

export async function logoutTodas() {
  try {
    await api('/auth/logout-todas', { metodo: 'POST' });
  } finally {
    cerrarSesionLocal();
  }
}
