import { useEffect, useState } from 'react';
import { tareas as apiTareas } from '../../api/recursos';
import { useNotificar } from '../../contexto/Notificaciones';
import { useProyecto } from '../../contexto/ProyectoContext';
import Modal from '../Modal';
import { Etiqueta } from '../insignias';
import { Alerta, AreaTexto, Boton, Campo, Selector } from '../ui';
import { PRIORIDADES, PUNTOS, TIPOS } from '../../utils/constantes';

const VACIO = { titulo: '', tipo: 'historia', prioridad: 'media', puntos: '', asignado_id: '', sprint_id: '', padre_id: '', fecha_limite: '', descripcion: '', etiquetas: [] };

/** Qué tareas pueden ser padre según el tipo elegido (misma regla que el backend). */
function candidatasPadre(tipo, lista) {
  if (tipo === 'epica') return [];
  if (tipo === 'subtarea') return lista.filter((t) => t.tipo !== 'subtarea');
  return lista.filter((t) => t.tipo === 'epica');
}

/**
 * Formulario para crear una tarea.
 * `iniciales` permite fijar sprint_id, padre_id o tipo (por ejemplo, desde un sprint).
 */
export default function NuevaTarea({ abierto, alCerrar, iniciales = {} }) {
  const { pid, miembros, sprints, etiquetas, tareasCambiaron } = useProyecto();
  const notificar = useNotificar();
  const [form, setForm] = useState(VACIO);
  const [posiblesPadres, setPosiblesPadres] = useState([]);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setForm({ ...VACIO, ...Object.fromEntries(Object.entries(iniciales).map(([k, v]) => [k, v ?? ''])) });
    setErrores({});
    setError('');
    apiTareas.listar(pid).then(setPosiblesPadres).catch(() => setPosiblesPadres([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, pid]);

  const poner = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  const padres = candidatasPadre(form.tipo, posiblesPadres);
  const sprintsAbiertos = sprints.filter((s) => s.estado !== 'cerrado');

  const alternarEtiqueta = (id) =>
    setForm((f) => ({ ...f, etiquetas: f.etiquetas.includes(id) ? f.etiquetas.filter((x) => x !== id) : [...f.etiquetas, id] }));

  const enviar = async (e) => {
    e.preventDefault();
    if (form.tipo === 'subtarea' && !form.padre_id) return setErrores({ padre_id: 'Elige la tarea a la que pertenece' });
    setEnviando(true);
    setErrores({});
    setError('');
    const num = (v) => (v === '' ? null : Number(v));
    try {
      const creada = await apiTareas.crear(pid, {
        titulo: form.titulo.trim(),
        tipo: form.tipo,
        prioridad: form.prioridad,
        puntos: form.tipo === 'epica' ? null : num(form.puntos),
        asignado_id: num(form.asignado_id),
        sprint_id: num(form.sprint_id),
        padre_id: form.tipo === 'epica' ? null : num(form.padre_id),
        fecha_limite: form.fecha_limite || null,
        descripcion: form.descripcion.trim() || undefined,
        etiquetas: form.etiquetas,
      });
      notificar(`${creada.clave} creada`);
      tareasCambiaron();
      alCerrar();
    } catch (err) {
      if (err.estado === 400 && err.detalles) setErrores(err.erroresPorCampo);
      else setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal abierto={abierto} alCerrar={alCerrar} titulo="Crear tarea" ancho="max-w-2xl">
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <Alerta>{error}</Alerta>
        <Campo etiqueta="Título" value={form.titulo} onChange={poner('titulo')} error={errores.titulo} placeholder="¿Qué hay que hacer?" />

        <div className="grid gap-4 sm:grid-cols-3">
          <Selector etiqueta="Tipo" value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value, padre_id: '' }))}>
            {Object.entries(TIPOS).map(([v, t]) => (
              <option key={v} value={v}>
                {t.nombre}
              </option>
            ))}
          </Selector>
          <Selector etiqueta="Prioridad" value={form.prioridad} onChange={poner('prioridad')}>
            {Object.entries(PRIORIDADES).map(([v, p]) => (
              <option key={v} value={v}>
                {p.flecha} {p.nombre}
              </option>
            ))}
          </Selector>
          <Selector etiqueta="Puntos" value={form.puntos} onChange={poner('puntos')} disabled={form.tipo === 'epica'} error={errores.puntos}>
            <option value="">{form.tipo === 'epica' ? 'Suma de sus hijas' : 'Sin estimar'}</option>
            {PUNTOS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Selector>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Selector etiqueta="Asignado a" value={form.asignado_id} onChange={poner('asignado_id')}>
            <option value="">Sin asignar</option>
            {miembros.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </Selector>
          <Selector etiqueta="Sprint" value={form.sprint_id} onChange={poner('sprint_id')}>
            <option value="">Backlog</option>
            {sprintsAbiertos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} {s.estado === 'activo' ? '(activo)' : ''}
              </option>
            ))}
          </Selector>
          {form.tipo !== 'epica' && (
            <Selector
              etiqueta={form.tipo === 'subtarea' ? 'Pertenece a' : 'Épica (opcional)'}
              value={form.padre_id}
              onChange={poner('padre_id')}
              error={errores.padre_id}
            >
              <option value="">{form.tipo === 'subtarea' ? 'Elige una tarea…' : 'Ninguna'}</option>
              {padres.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.clave} · {t.titulo}
                </option>
              ))}
            </Selector>
          )}
          <Campo etiqueta="Fecha límite" tipo="date" value={form.fecha_limite} onChange={poner('fecha_limite')} error={errores.fecha_limite} />
        </div>

        {etiquetas.length > 0 && (
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium text-slate-700">Etiquetas</legend>
            <div className="flex flex-wrap gap-2">
              {etiquetas.map((et) => {
                const activa = form.etiquetas.includes(et.id);
                return (
                  <button
                    key={et.id}
                    type="button"
                    onClick={() => alternarEtiqueta(et.id)}
                    aria-pressed={activa}
                    className={`rounded-full ring-offset-1 transition ${activa ? 'ring-2 ring-blue-500' : 'opacity-60 hover:opacity-100'}`}
                  >
                    <Etiqueta etiqueta={et} />
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <AreaTexto etiqueta="Descripción" value={form.descripcion} onChange={poner('descripcion')} rows={4} placeholder="Criterios de aceptación, detalles…" />

        <div className="flex justify-end gap-2 pt-2">
          <Boton type="button" variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={enviando} disabled={!form.titulo.trim()}>
            Crear
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
