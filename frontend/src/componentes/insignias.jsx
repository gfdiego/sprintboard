import { ESTADOS, PRIORIDADES, ROLES, TIPOS } from '../utils/constantes';
import { iniciales } from '../utils/formato';

export function TipoIcono({ tipo, className = 'size-4' }) {
  const t = TIPOS[tipo] || TIPOS.tarea;
  return (
    <span
      title={t.nombre}
      className={`inline-flex shrink-0 items-center justify-center rounded ${t.color} ${className} text-[9px] font-bold text-white`}
    >
      {t.nombre[0]}
    </span>
  );
}

export function PrioridadIcono({ prioridad, conTexto = false }) {
  const p = PRIORIDADES[prioridad] || PRIORIDADES.media;
  return (
    <span title={`Prioridad ${p.nombre.toLowerCase()}`} className={`inline-flex items-center gap-1 text-sm font-bold ${p.color}`}>
      {p.flecha}
      {conTexto && <span className="font-normal text-slate-700">{p.nombre}</span>}
    </span>
  );
}

// Color estable por persona
const FONDOS = ['bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-rose-600', 'bg-amber-600', 'bg-cyan-600', 'bg-fuchsia-600'];

export function Avatar({ usuario, tamano = 'size-7', texto = 'text-[11px]' }) {
  if (!usuario) {
    return (
      <span title="Sin asignar" className={`inline-flex ${tamano} shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 ${texto}`}>
        ?
      </span>
    );
  }
  return (
    <span
      title={usuario.nombre}
      className={`inline-flex ${tamano} shrink-0 items-center justify-center rounded-full font-semibold text-white ${texto} ${FONDOS[usuario.id % FONDOS.length]}`}
    >
      {iniciales(usuario.nombre)}
    </span>
  );
}

export function Etiqueta({ etiqueta, alQuitar }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${etiqueta.color}22`, color: etiqueta.color }}
    >
      {etiqueta.nombre}
      {alQuitar && (
        <button onClick={alQuitar} className="opacity-70 hover:opacity-100" aria-label={`Quitar ${etiqueta.nombre}`}>
          ×
        </button>
      )}
    </span>
  );
}

export function EstadoInsignia({ estado }) {
  const e = ESTADOS[estado];
  return <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${e.insignia}`}>{e.nombre}</span>;
}

export function RolInsignia({ rol }) {
  const r = ROLES[rol];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${r.insignia}`}>{r.nombre}</span>;
}

export function Puntos({ valor }) {
  if (valor == null) return null;
  return (
    <span title={`${valor} puntos`} className="inline-flex min-w-6 items-center justify-center rounded-full bg-slate-200 px-1.5 text-xs font-semibold text-slate-700">
      {valor}
    </span>
  );
}
