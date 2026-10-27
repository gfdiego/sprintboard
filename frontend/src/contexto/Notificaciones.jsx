import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const NotificacionesContext = createContext(null);

const ESTILOS = {
  exito: 'border-green-200 bg-white text-green-800',
  error: 'border-red-200 bg-white text-red-700',
  advertencia: 'border-amber-200 bg-amber-50 text-amber-800',
};
const ICONOS = { exito: '✓', error: '!', advertencia: '⚠' };

let siguienteId = 1;

/** Mensajes breves en la esquina: notificar('Tarea creada'), notificar(err.message, 'error'). */
export function NotificacionesProvider({ children }) {
  const [lista, setLista] = useState([]);

  const quitar = useCallback((id) => setLista((l) => l.filter((n) => n.id !== id)), []);

  const notificar = useCallback(
    (mensaje, tipo = 'exito') => {
      const id = siguienteId++;
      setLista((l) => [...l.slice(-3), { id, mensaje, tipo }]);
      setTimeout(() => quitar(id), tipo === 'exito' ? 3500 : 6000);
    },
    [quitar]
  );

  const valor = useMemo(() => ({ notificar }), [notificar]);

  return (
    <NotificacionesContext.Provider value={valor}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {lista.map((n) => (
          <div
            key={n.id}
            role={n.tipo === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${ESTILOS[n.tipo]}`}
          >
            <span className="font-bold">{ICONOS[n.tipo]}</span>
            <p className="flex-1">{n.mensaje}</p>
            <button onClick={() => quitar(n.id)} className="text-slate-400 hover:text-slate-600" aria-label="Cerrar">
              ×
            </button>
          </div>
        ))}
      </div>
    </NotificacionesContext.Provider>
  );
}

export function useNotificar() {
  const contexto = useContext(NotificacionesContext);
  if (!contexto) throw new Error('useNotificar debe usarse dentro de <NotificacionesProvider>');
  return contexto.notificar;
}
