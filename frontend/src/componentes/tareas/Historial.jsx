import { useProyecto } from '../../contexto/ProyectoContext';
import { useCarga } from '../../hooks/useCarga';
import { tareas as apiTareas } from '../../api/recursos';
import { Avatar } from '../insignias';
import { Alerta, Cargando } from '../ui';
import { ESTADOS, PRIORIDADES, TIPOS } from '../../utils/constantes';
import { fechaCorta, fechaHora, tiempoRelativo } from '../../utils/formato';

const NOMBRES_CAMPO = {
  titulo: 'el título',
  descripcion: 'la descripción',
  tipo: 'el tipo',
  prioridad: 'la prioridad',
  puntos: 'los puntos',
  sprint_id: 'el sprint',
  padre_id: 'la tarea padre',
  fecha_limite: 'la fecha límite',
};

function Valor({ children }) {
  return <strong className="font-medium text-slate-800">{children}</strong>;
}

/** Convierte cada registro del historial en una frase. */
function useDescribir() {
  const { miembros, sprints, etiquetas } = useProyecto();
  const persona = (id) => (id == null ? 'nadie' : miembros.find((m) => m.id === id)?.nombre || 'un ex miembro');
  const sprint = (id) => (id == null ? 'Backlog' : sprints.find((s) => s.id === id)?.nombre || `sprint #${id}`);
  const etiqueta = (id) => etiquetas.find((e) => e.id === id)?.nombre || 'eliminada';

  const valor = (campo, v) => {
    if (v == null || v === '') return 'vacío';
    if (campo === 'tipo') return TIPOS[v]?.nombre || v;
    if (campo === 'prioridad') return PRIORIDADES[v]?.nombre || v;
    if (campo === 'sprint_id') return sprint(v);
    if (campo === 'padre_id') return `#${v}`;
    if (campo === 'fecha_limite') return fechaCorta(v);
    return String(v);
  };

  return (h) => {
    const c = h.cambios || {};
    switch (h.accion) {
      case 'creada':
        return <>creó la tarea</>;
      case 'estado':
        return (
          <>
            movió de <Valor>{ESTADOS[c.estado?.de]?.nombre}</Valor> a <Valor>{ESTADOS[c.estado?.a]?.nombre}</Valor>
          </>
        );
      case 'asignada':
        return c.asignado_id?.a == null ? (
          <>quitó la asignación</>
        ) : (
          <>
            asignó a <Valor>{persona(c.asignado_id.a)}</Valor>
          </>
        );
      case 'sprint':
        return (
          <>
            devolvió la tarea al <Valor>Backlog</Valor>
            {c.motivo ? ` (${c.motivo})` : ''}
          </>
        );
      case 'etiquetas': {
        const de = c.etiquetas?.de || [];
        const a = c.etiquetas?.a || [];
        const agregadas = a.filter((id) => !de.includes(id)).map(etiqueta);
        const quitadas = de.filter((id) => !a.includes(id)).map(etiqueta);
        return (
          <>
            {agregadas.length > 0 && (
              <>
                agregó <Valor>{agregadas.join(', ')}</Valor>
              </>
            )}
            {agregadas.length > 0 && quitadas.length > 0 && ' y '}
            {quitadas.length > 0 && (
              <>
                quitó <Valor>{quitadas.join(', ')}</Valor>
              </>
            )}
            {!agregadas.length && !quitadas.length && 'actualizó las etiquetas'}
          </>
        );
      }
      case 'editada':
        return (
          <>
            {Object.entries(c).map(([campo, cambio], i) => (
              <span key={campo}>
                {i > 0 && ', '}
                {campo === 'descripcion' ? (
                  'actualizó la descripción'
                ) : (
                  <>
                    cambió {NOMBRES_CAMPO[campo] || campo} de <Valor>{valor(campo, cambio.de)}</Valor> a <Valor>{valor(campo, cambio.a)}</Valor>
                  </>
                )}
              </span>
            ))}
          </>
        );
      default:
        return <>{h.accion}</>;
    }
  };
}

export default function Historial({ tareaId, version }) {
  const { datos, error, cargando } = useCarga(() => apiTareas.historial(tareaId), [tareaId, version]);
  const describir = useDescribir();

  if (error) return <Alerta>{error.message}</Alerta>;
  if (cargando && !datos) return <Cargando />;

  return (
    <ol className="space-y-4">
      {datos.map((h) => (
        <li key={h.id} className="flex gap-3 text-sm">
          <Avatar usuario={h.usuario} tamano="size-7" />
          <div>
            <p className="text-slate-600">
              <span className="font-medium text-slate-900">{h.usuario?.nombre || 'Alguien'}</span> {describir(h)}
            </p>
            <p className="text-xs text-slate-400" title={fechaHora(h.creado_en)}>
              {tiempoRelativo(h.creado_en)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
