import { useId, useState } from 'react';

export function Campo({ etiqueta, error, ayuda, tipo = 'text', ...props }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const esPassword = tipo === 'password';

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {etiqueta}
      </label>
      <div className="relative">
        <input
          id={id}
          type={esPassword && visible ? 'text' : tipo}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm outline-none transition
            placeholder:text-slate-400 focus:ring-2
            ${esPassword ? 'pr-20' : ''}
            ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'}`}
          {...props}
        />
        {esPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            {visible ? 'Ocultar' : 'Mostrar'}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-xs text-red-600">
          {error}
        </p>
      ) : (
        ayuda && <div className="text-xs text-slate-500">{ayuda}</div>
      )}
    </div>
  );
}

const BASE_CONTROL =
  'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500';

export function Selector({ etiqueta, error, children, className = '', ...props }) {
  const id = useId();
  return (
    <div className={`space-y-1.5 ${className}`}>
      {etiqueta && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {etiqueta}
        </label>
      )}
      <select id={id} className={`${BASE_CONTROL} ${error ? 'border-red-400' : ''}`} {...props}>
        {children}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function AreaTexto({ etiqueta, error, className = '', ...props }) {
  const id = useId();
  return (
    <div className={`space-y-1.5 ${className}`}>
      {etiqueta && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {etiqueta}
        </label>
      )}
      <textarea id={id} rows={4} className={`${BASE_CONTROL} resize-y ${error ? 'border-red-400' : ''}`} {...props} />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** Mensaje para listas vacías. */
export function Vacio({ titulo, children, accion }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <p className="font-medium text-slate-900">{titulo}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{children}</p>}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}

export function Cargando() {
  return (
    <div className="flex justify-center py-16 text-blue-600">
      <Spinner />
    </div>
  );
}

const VARIANTES = {
  primario: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-300',
  secundario: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-200',
  peligro: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-300',
  fantasma: 'text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-200',
};

export function Boton({ variante = 'primario', cargando = false, className = '', children, disabled, ...props }) {
  return (
    <button
      disabled={disabled || cargando}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition
        focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60
        ${VARIANTES[variante]} ${className}`}
      {...props}
    >
      {cargando && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

const ESTILOS_ALERTA = {
  error: 'border-red-200 bg-red-50 text-red-700',
  exito: 'border-green-200 bg-green-50 text-green-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
};

export function Alerta({ tipo = 'error', children }) {
  if (!children) return null;
  return (
    <div role={tipo === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2 text-sm ${ESTILOS_ALERTA[tipo]}`}>
      {children}
    </div>
  );
}

export function Spinner({ className = 'size-6' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function PantallaCarga() {
  return (
    <div className="flex min-h-screen items-center justify-center text-blue-600">
      <Spinner className="size-8" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}

/** `compacto`: en pantallas pequeñas muestra solo el ícono. */
export function Logo({ className = '', compacto = false }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold text-slate-900 ${className}`}>
      <img src="/logo.svg" alt="" className="size-7" />
      <span className={compacto ? 'hidden sm:inline' : ''}>SprintBoard</span>
    </span>
  );
}
