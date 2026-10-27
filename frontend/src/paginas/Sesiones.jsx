import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexto/AuthContext';
import { cerrarSesionDispositivo, listarSesiones } from '../api/auth';
import { cerrarSesionLocal } from '../api/cliente';
import { Alerta, Boton, Spinner } from '../componentes/ui';
import { describirAgente, esMovil, fechaHora, tiempoRelativo } from '../utils/formato';

function IconoDispositivo({ movil }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5" aria-hidden="true">
        {movil ? (
          <>
            <rect x="7" y="2" width="10" height="20" rx="2" />
            <path d="M11 18h2" />
          </>
        ) : (
          <>
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <path d="M8 20h8M12 16v4" />
          </>
        )}
      </svg>
    </span>
  );
}

export default function Sesiones() {
  const { cerrarTodas } = useAuth();
  const [sesiones, setSesiones] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [cerrando, setCerrando] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setSesiones(await listarSesiones());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cerrar = async (sesion) => {
    const mensaje = sesion.actual
      ? 'Vas a cerrar la sesión en este dispositivo. ¿Continuar?'
      : `¿Cerrar la sesión en ${describirAgente(sesion.agente)}?`;
    if (!window.confirm(mensaje)) return;

    setCerrando(sesion.id);
    setError('');
    try {
      await cerrarSesionDispositivo(sesion.id);
      if (sesion.actual) return cerrarSesionLocal();
      setAviso('Sesión cerrada. Ese dispositivo tendrá que volver a iniciar sesión.');
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setCerrando(null);
    }
  };

  const cerrarEnTodos = async () => {
    if (!window.confirm('Se cerrará la sesión en todos tus dispositivos, incluido este. ¿Continuar?')) return;
    setCerrando('todas');
    try {
      await cerrarTodas();
    } catch (err) {
      setError(err.message);
      setCerrando(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">Sesiones activas</h1>
          <p className="text-sm text-slate-500">
            Dispositivos donde tu cuenta tiene la sesión abierta. Si no reconoces alguno, ciérralo.
          </p>
        </div>
        <Boton variante="peligro" onClick={cerrarEnTodos} cargando={cerrando === 'todas'} disabled={!sesiones?.length}>
          Cerrar en todos
        </Boton>
      </div>

      <Alerta>{error}</Alerta>
      <Alerta tipo="exito">{aviso}</Alerta>

      {!sesiones && !error && (
        <div className="flex justify-center py-12 text-blue-600">
          <Spinner />
        </div>
      )}

      {sesiones && sesiones.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          No hay sesiones activas.
        </p>
      )}

      {sesiones && sesiones.length > 0 && (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {sesiones.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-4 p-4">
              <IconoDispositivo movil={esMovil(s.agente)} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
                  {describirAgente(s.agente)}
                  {s.actual && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Este dispositivo
                    </span>
                  )}
                </p>
                <p className="text-sm text-slate-500">
                  {s.ip || 'IP desconocida'} · Activa {tiempoRelativo(s.ultima_actividad)}
                </p>
                <p className="text-xs text-slate-400">Inició {fechaHora(s.iniciada_en)}</p>
              </div>
              <Boton variante="secundario" onClick={() => cerrar(s)} cargando={cerrando === s.id}>
                Cerrar
              </Boton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
