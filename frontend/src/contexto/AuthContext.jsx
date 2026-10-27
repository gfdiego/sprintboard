import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { alTerminarSesion, refrescar, token } from '../api/cliente';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Al abrir la app se recupera la sesión: con el access token de esta pestaña
  // o, si no hay (pestaña nueva, F5 tras vencer), con la cookie del refresh token.
  useEffect(() => {
    let activo = true;
    const recuperar = token.obtener() ? authApi.yo() : refrescar();
    recuperar
      .then((u) => activo && setUsuario(u))
      .catch(() => activo && setUsuario(null))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, []);

  // Sesión expirada o cerrada en otra pestaña
  useEffect(() => alTerminarSesion(() => setUsuario(null)), []);

  const iniciarSesion = useCallback(async (correo, password) => {
    setUsuario(await authApi.login(correo, password));
  }, []);

  const registrarse = useCallback(async (nombre, correo, password) => {
    setUsuario(await authApi.registro(nombre, correo, password));
  }, []);

  const cerrarSesion = useCallback(() => authApi.logout(), []);
  const cerrarTodas = useCallback(() => authApi.logoutTodas(), []);

  const valor = useMemo(
    () => ({ usuario, cargando, iniciarSesion, registrarse, cerrarSesion, cerrarTodas }),
    [usuario, cargando, iniciarSesion, registrarse, cerrarSesion, cerrarTodas]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return contexto;
}
