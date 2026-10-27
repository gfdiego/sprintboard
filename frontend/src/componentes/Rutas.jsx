import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../contexto/AuthContext';
import { PantallaCarga } from './ui';

/** Solo usuarios con sesión. Si no hay, manda al login y recuerda a dónde iba. */
export function RutaProtegida() {
  const { usuario, cargando } = useAuth();
  const ubicacion = useLocation();

  if (cargando) return <PantallaCarga />;
  if (!usuario) return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />;
  return <Outlet />;
}

/**
 * Solo invitados (login, registro). Con sesión abierta lleva a la página que
 * el usuario intentaba abrir antes del login, o al inicio.
 */
export function RutaInvitado() {
  const { usuario, cargando } = useAuth();
  const ubicacion = useLocation();

  if (cargando) return <PantallaCarga />;
  if (usuario) return <Navigate to={ubicacion.state?.desde || '/'} replace />;
  return <Outlet />;
}
