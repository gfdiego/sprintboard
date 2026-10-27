import { Avatar, Etiqueta, PrioridadIcono, Puntos, TipoIcono, EstadoInsignia } from '../insignias';
import { fechaCorta, vencida } from '../../utils/formato';

function Metadatos({ tarea }) {
  const atrasada = tarea.estado !== 'hecho' && vencida(tarea.fecha_limite);
  return (
    <>
      {tarea.fecha_limite && (
        <span className={`text-xs ${atrasada ? 'font-medium text-red-600' : 'text-slate-500'}`} title="Fecha límite">
          {atrasada ? '⚠ ' : ''}
          {fechaCorta(tarea.fecha_limite)}
        </span>
      )}
      {tarea.total_hijas > 0 && (
        <span className="text-xs text-slate-500" title="Subtareas">
          ☰ {tarea.total_hijas}
        </span>
      )}
      {tarea.total_comentarios > 0 && (
        <span className="text-xs text-slate-500" title="Comentarios">
          💬 {tarea.total_comentarios}
        </span>
      )}
    </>
  );
}

/** Tarjeta del tablero. */
export function TarjetaTarea({ tarea, alAbrir, arrastrable, alEmpezarArrastre, alTerminarArrastre, fantasma }) {
  return (
    <article
      draggable={arrastrable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(tarea.id));
        alEmpezarArrastre?.(tarea);
      }}
      onDragEnd={alTerminarArrastre}
      onClick={() => alAbrir(tarea.id)}
      onKeyDown={(e) => e.key === 'Enter' && alAbrir(tarea.id)}
      tabIndex={0}
      className={`group cursor-pointer space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm outline-none transition
        hover:border-blue-300 hover:shadow focus-visible:ring-2 focus-visible:ring-blue-400
        ${arrastrable ? 'active:cursor-grabbing' : ''} ${fantasma ? 'opacity-40' : ''}`}
    >
      <p className={`text-sm leading-snug text-slate-800 ${tarea.estado === 'hecho' ? 'text-slate-500 line-through decoration-slate-300' : ''}`}>
        {tarea.titulo}
      </p>
      {tarea.etiquetas.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tarea.etiquetas.map((et) => (
            <Etiqueta key={et.id} etiqueta={et} />
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <TipoIcono tipo={tarea.tipo} />
        <span className="text-xs font-medium text-slate-500">{tarea.clave}</span>
        <Metadatos tarea={tarea} />
        <span className="ml-auto flex items-center gap-1.5">
          <PrioridadIcono prioridad={tarea.prioridad} />
          <Puntos valor={tarea.puntos} />
          <Avatar usuario={tarea.asignado} tamano="size-6" texto="text-[10px]" />
        </span>
      </div>
    </article>
  );
}

/** Fila para listas (backlog, sprints, subtareas). `acciones` va a la derecha. */
export function FilaTarea({ tarea, alAbrir, acciones, mostrarEstado = true }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50">
      <TipoIcono tipo={tarea.tipo} />
      <button onClick={() => alAbrir(tarea.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <span className="shrink-0 text-xs font-medium text-slate-500">{tarea.clave}</span>
        <span className={`truncate text-sm text-slate-800 hover:text-blue-700 ${tarea.estado === 'hecho' ? 'line-through decoration-slate-300' : ''}`}>
          {tarea.titulo}
        </span>
      </button>
      <span className="hidden items-center gap-1 lg:flex">
        {tarea.etiquetas.slice(0, 2).map((et) => (
          <Etiqueta key={et.id} etiqueta={et} />
        ))}
      </span>
      {/* En móvil se ocultan los detalles secundarios para dejar espacio al título */}
      <span className="hidden items-center gap-3 md:flex">
        <Metadatos tarea={tarea} />
      </span>
      {mostrarEstado && (
        <span className="hidden sm:inline-flex">
          <EstadoInsignia estado={tarea.estado} />
        </span>
      )}
      <PrioridadIcono prioridad={tarea.prioridad} />
      <span className="w-7 text-center">
        <Puntos valor={tarea.puntos} />
      </span>
      <Avatar usuario={tarea.asignado} tamano="size-6" texto="text-[10px]" />
      {acciones}
    </div>
  );
}
