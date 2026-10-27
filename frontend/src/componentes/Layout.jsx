import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../contexto/AuthContext';
import { Boton, Logo } from './ui';
import { iniciales } from '../utils/formato';

const enlace = ({ isActive }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition ${
    isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

export default function Layout() {
  const { usuario, cerrarSesion } = useAuth();
  const location = useLocation();
  const [saliendo, setSaliendo] = useState(false);

  const salir = async () => {
    setSaliendo(true);
    try {
      await cerrarSesion();
    } catch {
      /* la sesión local se cierra igual */
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:gap-4">
          <Link to="/" aria-label="Inicio">
            <Logo compacto />
          </Link>
          <nav className="flex gap-1">
            <NavLink to="/" className={({ isActive }) => enlace({ isActive: isActive && !location.pathname.startsWith('/sesiones') })}>
              Proyectos
            </NavLink>
            <NavLink to="/sesiones" className={enlace}>
              Sesiones
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-1 sm:gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight text-slate-900">{usuario.nombre}</p>
              <p className="text-xs leading-tight text-slate-500">{usuario.correo}</p>
            </div>
            <span
              className="flex size-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white"
              aria-hidden="true"
            >
              {iniciales(usuario.nombre)}
            </span>
            <Boton variante="fantasma" cargando={saliendo} onClick={salir}>
              Salir
            </Boton>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
