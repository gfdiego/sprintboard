import { useState } from 'react';
import { useNavigate } from 'react-router';
import * as recursos from '../../api/recursos';
import { useAuth } from '../../contexto/AuthContext';
import { useNotificar } from '../../contexto/Notificaciones';
import { useProyecto } from '../../contexto/ProyectoContext';
import { Avatar, Etiqueta, RolInsignia } from '../../componentes/insignias';
import { AreaTexto, Boton, Campo, Selector } from '../../componentes/ui';
import { COLORES_ETIQUETA, ROLES } from '../../utils/constantes';

function Seccion({ titulo, descripcion, children }) {
  return (
    <section className="grid gap-4 border-b border-slate-200 pb-8 md:grid-cols-3">
      <div>
        <h2 className="font-semibold text-slate-900">{titulo}</h2>
        <p className="mt-1 text-sm text-slate-500">{descripcion}</p>
      </div>
      <div className="md:col-span-2">{children}</div>
    </section>
  );
}

function DatosProyecto() {
  const { proyecto, esAdmin, recargarProyecto } = useProyecto();
  const notificar = useNotificar();
  const [form, setForm] = useState({ nombre: proyecto.nombre, descripcion: proyecto.descripcion || '' });
  const [guardando, setGuardando] = useState(false);
  const sinCambios = form.nombre === proyecto.nombre && form.descripcion === (proyecto.descripcion || '');

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await recursos.proyectos.actualizar(proyecto.id, { nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null });
      await recargarProyecto();
      notificar('Proyecto actualizado');
    } catch (err) {
      notificar(err.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Seccion titulo="Proyecto" descripcion={`La clave ${proyecto.clave} no se puede cambiar porque forma parte del nombre de cada tarea.`}>
      <form onSubmit={guardar} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <Campo etiqueta="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} disabled={!esAdmin} />
        <AreaTexto
          etiqueta="Descripción"
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          disabled={!esAdmin}
          rows={3}
        />
        {esAdmin && (
          <div className="flex justify-end">
            <Boton type="submit" cargando={guardando} disabled={sinCambios || form.nombre.trim().length < 2}>
              Guardar cambios
            </Boton>
          </div>
        )}
      </form>
    </Seccion>
  );
}

function Miembros() {
  const { pid, miembros, esAdmin, recargarMiembros, tareasCambiaron } = useProyecto();
  const { usuario } = useAuth();
  const notificar = useNotificar();
  const navegar = useNavigate();
  const [nuevo, setNuevo] = useState({ correo: '', rol: 'miembro', capacidad_puntos: 10 });
  const [agregando, setAgregando] = useState(false);
  const [errorCorreo, setErrorCorreo] = useState('');

  const agregar = async (e) => {
    e.preventDefault();
    setErrorCorreo('');
    setAgregando(true);
    try {
      const m = await recursos.miembros.agregar(pid, { ...nuevo, correo: nuevo.correo.trim() });
      await recargarMiembros();
      setNuevo({ correo: '', rol: 'miembro', capacidad_puntos: 10 });
      notificar(`${m.nombre} se unió al proyecto`);
    } catch (err) {
      if (err.estado === 404 || err.estado === 409 || err.estado === 400) setErrorCorreo(err.erroresPorCampo.correo || err.message);
      else notificar(err.message, 'error');
    } finally {
      setAgregando(false);
    }
  };

  const actualizar = async (m, cambios) => {
    try {
      await recursos.miembros.actualizar(pid, m.id, cambios);
      await recargarMiembros();
      notificar(`${m.nombre} actualizado`);
    } catch (err) {
      notificar(err.message, 'error');
      recargarMiembros();
    }
  };

  const quitar = async (m) => {
    const yo = m.id === usuario.id;
    const pregunta = yo
      ? '¿Salir del proyecto? Tus tareas abiertas quedarán sin asignar.'
      : `¿Quitar a ${m.nombre}? Sus tareas abiertas quedarán sin asignar.`;
    if (!window.confirm(pregunta)) return;
    try {
      await recursos.miembros.quitar(pid, m.id);
      if (yo) {
        notificar('Saliste del proyecto');
        return navegar('/');
      }
      await recargarMiembros();
      tareasCambiaron();
      notificar(`${m.nombre} ya no es miembro`);
    } catch (err) {
      notificar(err.message, 'error');
    }
  };

  return (
    <Seccion titulo="Miembros" descripcion="La capacidad son los puntos que cada persona puede asumir por sprint. Se usa en el reporte de carga.">
      <div className="space-y-4">
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {miembros.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 p-4">
              <Avatar usuario={m} tamano="size-9" texto="text-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {m.nombre} {m.id === usuario.id && <span className="text-slate-400">(tú)</span>}
                </p>
                <p className="truncate text-xs text-slate-500">{m.correo}</p>
              </div>
              {esAdmin ? (
                <>
                  <label className="flex items-center gap-1 text-xs text-slate-500">
                    <input
                      key={`${m.id}-${m.capacidad_puntos}`}
                      type="number"
                      min={0}
                      max={200}
                      defaultValue={m.capacidad_puntos}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isInteger(v) && v !== m.capacidad_puntos) actualizar(m, { capacidad_puntos: v });
                      }}
                      className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800"
                      aria-label={`Capacidad de ${m.nombre}`}
                    />
                    pts
                  </label>
                  <select
                    value={m.rol}
                    onChange={(e) => actualizar(m, { rol: e.target.value })}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                    aria-label={`Rol de ${m.nombre}`}
                  >
                    {Object.entries(ROLES).map(([v, r]) => (
                      <option key={v} value={v}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <span className="text-xs text-slate-500">{m.capacidad_puntos} pts</span>
                  <RolInsignia rol={m.rol} />
                </>
              )}
              {(esAdmin || m.id === usuario.id) && (
                <Boton variante="fantasma" className="!px-2 text-red-600 hover:!bg-red-50" onClick={() => quitar(m)}>
                  {m.id === usuario.id ? 'Salir' : 'Quitar'}
                </Boton>
              )}
            </li>
          ))}
        </ul>

        {esAdmin && (
          <form onSubmit={agregar} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-900">Agregar miembro</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_9rem_7rem]">
              <Campo
                etiqueta="Correo"
                tipo="email"
                value={nuevo.correo}
                onChange={(e) => setNuevo({ ...nuevo, correo: e.target.value })}
                error={errorCorreo}
                placeholder="persona@correo.com"
              />
              <Selector etiqueta="Rol" value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value })}>
                {Object.entries(ROLES).map(([v, r]) => (
                  <option key={v} value={v}>
                    {r.nombre}
                  </option>
                ))}
              </Selector>
              <Campo
                etiqueta="Capacidad"
                tipo="number"
                min={0}
                max={200}
                value={nuevo.capacidad_puntos}
                onChange={(e) => setNuevo({ ...nuevo, capacidad_puntos: Number(e.target.value) })}
              />
            </div>
            <p className="text-xs text-slate-500">La persona debe tener una cuenta registrada con ese correo. {ROLES[nuevo.rol].descripcion}.</p>
            <div className="flex justify-end">
              <Boton type="submit" cargando={agregando} disabled={!nuevo.correo.trim()}>
                Agregar
              </Boton>
            </div>
          </form>
        )}
      </div>
    </Seccion>
  );
}

function Etiquetas() {
  const { pid, etiquetas, esAdmin, puedeEditar, recargarEtiquetas, tareasCambiaron } = useProyecto();
  const notificar = useNotificar();
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState(COLORES_ETIQUETA[6]);
  const [creando, setCreando] = useState(false);

  const crear = async (e) => {
    e.preventDefault();
    setCreando(true);
    try {
      await recursos.etiquetas.crear(pid, { nombre: nombre.trim(), color });
      await recargarEtiquetas();
      setNombre('');
    } catch (err) {
      notificar(err.message, 'error');
    } finally {
      setCreando(false);
    }
  };

  const eliminar = async (et) => {
    const uso = et.total_tareas ? ` Se quitará de ${et.total_tareas} tarea(s).` : '';
    if (!window.confirm(`¿Eliminar la etiqueta "${et.nombre}"?${uso}`)) return;
    try {
      await recursos.etiquetas.eliminar(pid, et.id);
      await recargarEtiquetas();
      tareasCambiaron();
    } catch (err) {
      notificar(err.message, 'error');
    }
  };

  return (
    <Seccion titulo="Etiquetas" descripcion="Sirven para agrupar tareas por tema: frontend, backend, diseño…">
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        {etiquetas.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no hay etiquetas.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {etiquetas.map((et) => (
              <li key={et.id} className="flex items-center gap-1">
                <Etiqueta etiqueta={et} alQuitar={esAdmin ? () => eliminar(et) : undefined} />
                <span className="text-xs text-slate-400">{et.total_tareas}</span>
              </li>
            ))}
          </ul>
        )}
        {puedeEditar && (
          <form onSubmit={crear} className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
            <Campo etiqueta="Nueva etiqueta" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="frontend" maxLength={40} />
            <div className="flex gap-1.5 pb-2" role="radiogroup" aria-label="Color">
              {COLORES_ETIQUETA.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={c === color}
                  aria-label={c}
                  onClick={() => setColor(c)}
                  className={`size-6 rounded-full transition ${c === color ? 'ring-2 ring-slate-900 ring-offset-2' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <Boton type="submit" cargando={creando} disabled={!nombre.trim()}>
              Crear
            </Boton>
          </form>
        )}
      </div>
    </Seccion>
  );
}

function ZonaPeligrosa() {
  const { proyecto } = useProyecto();
  const notificar = useNotificar();
  const navegar = useNavigate();
  const [confirmacion, setConfirmacion] = useState('');
  const [eliminando, setEliminando] = useState(false);

  const eliminar = async () => {
    setEliminando(true);
    try {
      await recursos.proyectos.eliminar(proyecto.id);
      notificar(`Proyecto ${proyecto.clave} eliminado`);
      navegar('/');
    } catch (err) {
      notificar(err.message, 'error');
      setEliminando(false);
    }
  };

  return (
    <Seccion titulo="Eliminar proyecto" descripcion="Se borran para siempre todas sus tareas, sprints, comentarios y etiquetas.">
      <div className="space-y-3 rounded-xl border border-red-200 bg-red-50/50 p-5">
        <Campo
          etiqueta={`Escribe ${proyecto.clave} para confirmar`}
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value.toUpperCase())}
        />
        <Boton variante="peligro" onClick={eliminar} cargando={eliminando} disabled={confirmacion !== proyecto.clave}>
          Eliminar proyecto
        </Boton>
      </div>
    </Seccion>
  );
}

export default function Ajustes() {
  const { esAdmin } = useProyecto();
  return (
    <div className="space-y-8">
      <DatosProyecto />
      <Miembros />
      <Etiquetas />
      {esAdmin && <ZonaPeligrosa />}
    </div>
  );
}
