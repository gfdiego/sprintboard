import { useEffect, useRef } from 'react';

/**
 * Ventana modal centrada. Se cierra con Esc o al hacer clic fuera.
 *   <Modal abierto={x} alCerrar={...} titulo="Nuevo proyecto">…</Modal>
 */
export default function Modal({ abierto, alCerrar, titulo, children, ancho = 'max-w-lg' }) {
  const caja = useRef(null);
  // Guardado en un ref: si el padre pasa una función nueva en cada render,
  // el efecto no se repite (y no roba el foco mientras se escribe)
  const cerrar = useRef(alCerrar);
  cerrar.current = alCerrar;

  useEffect(() => {
    if (!abierto) return;
    const anterior = document.activeElement;
    const alPresionar = (e) => e.key === 'Escape' && cerrar.current();
    document.addEventListener('keydown', alPresionar);
    document.body.style.overflow = 'hidden';
    // Enfoca el primer campo
    setTimeout(() => {
      const c = caja.current;
      (c?.querySelector('[autofocus], input, select, textarea') || c?.querySelector('div.p-5 button'))?.focus();
    }, 0);
    return () => {
      document.removeEventListener('keydown', alPresionar);
      document.body.style.overflow = '';
      anterior?.focus?.();
    };
  }, [abierto]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && alCerrar()}
    >
      <div ref={caja} role="dialog" aria-modal="true" aria-label={titulo} className={`w-full ${ancho} rounded-xl bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
          <button onClick={alCerrar} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
