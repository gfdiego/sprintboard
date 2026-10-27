import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { sprints as apiSprints, tareas as apiTareas } from '../../api/recursos';
import { useNotificar } from '../../contexto/Notificaciones';
import { useProyecto } from '../../contexto/ProyectoContext';
import { useCarga } from '../../hooks/useCarga';
import Modal from '../../componentes/Modal';
import NuevaTarea from '../../componentes/tareas/NuevaTarea';
import { FilaTarea } from '../../componentes/tareas/TarjetaTarea';
import { Alerta, AreaTexto, Boton, Campo, Cargando } from '../../componentes/ui';
import { ESTADOS_SPRINT } from '../../utils/constantes';
import { hoyYmd, rangoFechas } from '../../utils/formato';

function sumarDias(ymd, dias) {
  const [a, m, d] = ymd.split('-').map(Number);
  const f = new Date(a, m - 1, d + dias);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
}

/** Crear o editar un sprint. */
function FormSprint({ sprint, abierto, alCerrar }) {
  const { pid, tareasCambiaron } = useProyecto();
  const notificar = useNotificar();
  const [form, setForm] = useState({});
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setErrores({});
    setForm({
      nombre: sprint?.nombre || '',
      objetivo: sprint?.objetivo || '',
      fecha_inicio: sprint?.fecha_inicio || '',
      fecha_fin: sprint?.fecha_fin || '',
    });
  }, [abierto, sprint]);

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setErrores({});
    try {
      if (sprint) {
        await apiSprints.actualizar(sprint.id, {
          nombre: form.nombre.trim() || sprint.nombre,
          objetivo: form.objetivo.trim() || null,
          fecha_inicio: form.fecha_inicio || null,
          fecha_fin: form.fecha_fin || null,
        });
        notificar('Sprint actualizado');
      } else {
        const creado = await apiSprints.crear(pid, {
          nombre: form.nombre.trim() || undefined,
          objetivo: form.objetivo.trim() || undefined,
          fecha_inicio: form.fecha_inicio || undefined,
          fecha_fin: form.fecha_fin || undefined,
        });
        notificar(`${creado.nombre} creado`);
      }
      tareasCambiaron();
      alCerrar();
    } catch (err) {
      if (err.detalles) setErrores(err.erroresPorCampo);
      else notificar(err.message, 'error');
    } finally {
      setEnviando(false);
    }
  };

  const poner = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <Modal abierto={abierto} alCerrar={alCerrar} titulo={sprint ? `Editar ${sprint.nombre}` : 'Nuevo sprint'}>
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <Campo etiqueta="Nombre" value={form.nombre || ''} onChange={poner('nombre')} placeholder={sprint ? '' : 'Se genera solo: Sprint 1, Sprint 2…'} error={errores.nombre} />
        <AreaTexto etiqueta="Objetivo" value={form.objetivo || ''} onChange={poner('objetivo')} rows={2} placeholder="¿Qué quiere lograr el equipo en este sprint?" />
        {sprint?.estado !== 'activo' && (
          <div className="grid grid-cols-2 gap-4">
            <Campo etiqueta="Inicio (opcional)" tipo="date" value={form.fecha_inicio || ''} onChange={poner('fecha_inicio')} error={errores.fecha_inicio} />
            <Campo etiqueta="Fin (opcional)" tipo="date" value={form.fecha_fin || ''} onChange={poner('fecha_fin')} error={errores.fecha_fin} />
          </div>
        )}
        {sprint?.estado === 'activo' && (
          <Campo etiqueta="Fin" tipo="date" value={form.fecha_fin || ''} onChange={poner('fecha_fin')} error={errores.fecha_fin} />
        )}
        <div className="flex justify-end gap-2">
          <Boton type="button" variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={enviando}>
            {sprint ? 'Guardar' : 'Crear sprint'}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}

function IniciarSprint({ sprint, alCerrar }) {
  const { tareasCambiaron } = useProyecto();
  const notificar = useNotificar();
  const sugerido = sprint?.fecha_fin && sprint.fecha_fin >= hoyYmd() ? sprint.fecha_fin : sumarDias(hoyYmd(), 13);
  const [fin, setFin] = useState(sugerido);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const iniciar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      await apiSprints.iniciar(sprint.id, { fecha_fin: fin });
      notificar(`${sprint.nombre} iniciado. ¡A trabajar!`);
      tareasCambiaron();
      alCerrar();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };

  return (
    <Modal abierto={Boolean(sprint)} alCerrar={alCerrar} titulo={`Iniciar ${sprint?.nombre || ''}`}>
      <form onSubmit={iniciar} className="space-y-4">
        <Alerta>{error}</Alerta>
        <p className="text-sm text-slate-600">
          El sprint empieza hoy con <strong>{sprint?.total_tareas} tarea(s)</strong> y <strong>{sprint?.puntos_totales} puntos</strong>. Sus tareas pasarán al tablero.
        </p>
        <Campo etiqueta="Termina el" tipo="date" value={fin} min={hoyYmd()} onChange={(e) => setFin(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {[
            ['1 semana', 6],
            ['2 semanas', 13],
            ['3 semanas', 20],
          ].map(([t, d]) => (
            <button key={t} type="button" onClick={() => setFin(sumarDias(hoyYmd(), d))} className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">
              {t}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Boton type="button" variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={enviando} disabled={!fin}>
            Iniciar sprint
          </Boton>
        </div>
      </form>
    </Modal>
  );
}

/** Una sección (sprint o backlog) que acepta tareas arrastradas. */
function Seccion({ id, titulo, insignia, detalle, acciones, tareas, arrastrada, alSoltar, alAbrir, alCrear, moverA, vacio, children }) {
  const { puedeEditar, sprints } = useProyecto();
  const [encima, setEncima] = useState(false);
  const aceptaSoltar = arrastrada && (arrastrada.sprint_id ?? null) !== id;
  const destinos = [{ id: null, nombre: 'Backlog' }, ...sprints.filter((s) => s.estado !== 'cerrado')].filter((d) => d.id !== id);

  return (
    <section
      onDragOver={(e) => aceptaSoltar && (e.preventDefault(), setEncima(true))}
      onDragLeave={() => setEncima(false)}
      onDrop={(e) => {
        e.preventDefault();
        setEncima(false);
        if (aceptaSoltar) alSoltar(id);
      }}
      className={`rounded-xl border bg-white transition ${encima ? 'border-blue-400 ring-2 ring-blue-200' : 'border-slate-200'}`}
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
        <h2 className="font-semibold text-slate-900">{titulo}</h2>
        {insignia}
        <span className="text-sm text-slate-500">{detalle}</span>
        <div className="ml-auto flex flex-wrap items-center gap-1">{acciones}</div>
      </header>
      {children}
      <div className="divide-y divide-slate-100">
        {tareas.map((t) => (
          <div
            key={t.id}
            draggable={puedeEditar}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', String(t.id));
              moverA.empezar(t);
            }}
            onDragEnd={moverA.terminar}
            className={`${puedeEditar ? 'cursor-grab active:cursor-grabbing' : ''} ${arrastrada?.id === t.id ? 'opacity-40' : ''}`}
          >
            <FilaTarea
              tarea={t}
              alAbrir={alAbrir}
              acciones={
                puedeEditar && (
                  <select
                    value=""
                    onChange={(e) => moverA.mover(t, e.target.value === 'backlog' ? null : Number(e.target.value))}
                    className="w-8 cursor-pointer rounded border-0 bg-transparent text-xs text-slate-400 hover:bg-slate-100 focus:w-auto"
                    aria-label={`Mover ${t.clave}`}
                    title="Mover a…"
                  >
                    <option value="" disabled>
                      ⋯
                    </option>
                    {destinos.map((d) => (
                      <option key={d.id ?? 'backlog'} value={d.id ?? 'backlog'}>
                        Mover a {d.nombre}
                      </option>
                    ))}
                  </select>
                )
              }
            />
          </div>
        ))}
        {tareas.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">{vacio}</p>}
      </div>
      {puedeEditar && (
        <button onClick={alCrear} className="w-full rounded-b-xl border-t border-slate-100 px-4 py-2 text-left text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-800">
          + Crear tarea
        </button>
      )}
    </section>
  );
}

export default function Backlog() {
  const { pid, proyecto, sprints, miembros, esAdmin, puedeEditar, versionTareas, abrirTarea, tareasCambiaron } = useProyecto();
  const notificar = useNotificar();
  const abiertos = sprints.filter((s) => s.estado !== 'cerrado');
  const cerrados = sprints.filter((s) => s.estado === 'cerrado');
  const claveSprints = abiertos.map((s) => s.id).join(',');

  const { datos, error } = useCarga(async () => {
    const [backlog, ...porSprint] = await Promise.all([
      apiTareas.backlog(pid),
      ...abiertos.map((s) => apiTareas.listar(pid, { sprint: s.id })),
    ]);
    const tareasSprint = Object.fromEntries(abiertos.map((s, i) => [s.id, porSprint[i].filter((t) => t.tipo !== 'subtarea').sort((a, b) => a.orden - b.orden)]));
    return { backlog, tareasSprint };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid, versionTareas, claveSprints]);

  const [busqueda, setBusqueda] = useState('');
  const [arrastrada, setArrastrada] = useState(null);
  const [crearEn, setCrearEn] = useState(undefined); // undefined = cerrado; null = backlog; id = sprint
  const [editandoSprint, setEditandoSprint] = useState(null);
  const [nuevoSprint, setNuevoSprint] = useState(false);
  const [iniciando, setIniciando] = useState(null);
  const [verCerrados, setVerCerrados] = useState(false);

  const capacidad = miembros.filter((m) => m.rol !== 'observador').reduce((s, m) => s + m.capacidad_puntos, 0);
  const q = busqueda.trim().toLowerCase();
  const filtrar = (lista) => (q ? lista.filter((t) => t.titulo.toLowerCase().includes(q) || t.clave.toLowerCase().includes(q)) : lista);

  const mover = async (tarea, sprintId) => {
    try {
      await apiTareas.actualizar(tarea.id, { sprint_id: sprintId });
      const nombre = sprintId ? sprints.find((s) => s.id === sprintId)?.nombre : 'el backlog';
      notificar(`${tarea.clave} movida a ${nombre}`);
      tareasCambiaron();
    } catch (err) {
      notificar(err.message, 'error');
    }
  };

  const moverA = { empezar: setArrastrada, terminar: () => setArrastrada(null), mover };
  const alSoltar = (sprintId) => {
    if (arrastrada) mover(arrastrada, sprintId);
    setArrastrada(null);
  };

  const eliminarSprint = async (s) => {
    const aviso = s.total_tareas ? ` Sus ${s.total_tareas} tarea(s) volverán al backlog.` : '';
    if (!window.confirm(`¿Eliminar ${s.nombre}?${aviso}`)) return;
    try {
      await apiSprints.eliminar(s.id);
      notificar(`${s.nombre} eliminado`);
      tareasCambiaron();
    } catch (err) {
      notificar(err.message, 'error');
    }
  };

  if (error) return <Alerta>{error.message}</Alerta>;
  if (!datos) return <Cargando />;

  const hayActivo = abiertos.some((s) => s.estado === 'activo');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar tareas…"
          className="w-64 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        {puedeEditar && <p className="text-xs text-slate-500">Arrastra las tareas entre el backlog y los sprints.</p>}
        {esAdmin && (
          <Boton className="ml-auto" variante="secundario" onClick={() => setNuevoSprint(true)}>
            + Crear sprint
          </Boton>
        )}
      </div>

      {abiertos.map((s) => {
        const lista = datos.tareasSprint[s.id] || [];
        const sobrecapacidad = capacidad > 0 && s.puntos_totales > capacidad;
        return (
          <Seccion
            key={s.id}
            id={s.id}
            titulo={s.nombre}
            insignia={<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADOS_SPRINT[s.estado].insignia}`}>{ESTADOS_SPRINT[s.estado].nombre}</span>}
            detalle={
              <>
                {rangoFechas(s.fecha_inicio, s.fecha_fin)} · {s.total_tareas} tareas ·{' '}
                <span className={sobrecapacidad ? 'font-medium text-amber-600' : ''} title={capacidad ? `Capacidad del equipo: ${capacidad} pts` : undefined}>
                  {s.puntos_totales}
                  {capacidad ? `/${capacidad}` : ''} pts
                </span>
              </>
            }
            acciones={
              <>
                {s.estado === 'activo' && (
                  <Link to={`/proyectos/${proyecto.id}`} className="rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50">
                    Ver tablero
                  </Link>
                )}
                {esAdmin && s.estado === 'planificado' && (
                  <Boton
                    className="!py-1.5"
                    onClick={() => setIniciando(s)}
                    disabled={hayActivo}
                    title={hayActivo ? 'Cierra el sprint activo antes de iniciar otro' : undefined}
                  >
                    Iniciar sprint
                  </Boton>
                )}
                {esAdmin && (
                  <Boton variante="fantasma" className="!py-1.5" onClick={() => setEditandoSprint(s)}>
                    Editar
                  </Boton>
                )}
                {esAdmin && s.estado === 'planificado' && (
                  <Boton variante="fantasma" className="!py-1.5 text-red-600 hover:!bg-red-50" onClick={() => eliminarSprint(s)}>
                    Eliminar
                  </Boton>
                )}
              </>
            }
            tareas={filtrar(lista)}
            arrastrada={arrastrada}
            alSoltar={alSoltar}
            alAbrir={abrirTarea}
            alCrear={() => setCrearEn(s.id)}
            moverA={moverA}
            vacio={q ? 'Ninguna tarea coincide' : 'Arrastra tareas del backlog para planificar este sprint'}
          >
            {s.objetivo && <p className="border-b border-slate-100 px-4 py-2 text-sm text-slate-600">🎯 {s.objetivo}</p>}
          </Seccion>
        );
      })}

      <Seccion
        id={null}
        titulo="Backlog"
        detalle={
          <>
            {datos.backlog.tareas.length} tareas · {datos.backlog.puntos_totales} pts
            {datos.backlog.sin_estimar > 0 && <span className="text-amber-600"> · {datos.backlog.sin_estimar} sin estimar</span>}
          </>
        }
        tareas={filtrar(datos.backlog.tareas)}
        arrastrada={arrastrada}
        alSoltar={alSoltar}
        alAbrir={abrirTarea}
        alCrear={() => setCrearEn(null)}
        moverA={moverA}
        vacio={q ? 'Ninguna tarea coincide' : 'El backlog está vacío. Crea la primera tarea.'}
      />

      {cerrados.length > 0 && (
        <section className="space-y-2">
          <button onClick={() => setVerCerrados((v) => !v)} className="text-sm font-medium text-slate-600 hover:text-slate-900">
            {verCerrados ? '▾' : '▸'} Sprints cerrados ({cerrados.length})
          </button>
          {verCerrados && (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {cerrados.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <span className="font-medium text-slate-800">{s.nombre}</span>
                  <span className="text-slate-500">{rangoFechas(s.fecha_inicio, s.fecha_fin)}</span>
                  <span className="ml-auto text-slate-500">
                    {s.tareas_hechas} tareas · <strong className="text-slate-800">{s.puntos_hechos} pts</strong> completados
                  </span>
                  <Link to={`/proyectos/${proyecto.id}/reportes?sprint=${s.id}`} className="text-blue-600 hover:underline">
                    Burndown
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <NuevaTarea abierto={crearEn !== undefined} alCerrar={() => setCrearEn(undefined)} iniciales={{ sprint_id: crearEn ?? null }} />
      <FormSprint abierto={nuevoSprint || Boolean(editandoSprint)} sprint={editandoSprint} alCerrar={() => (setNuevoSprint(false), setEditandoSprint(null))} />
      {iniciando && <IniciarSprint sprint={iniciando} alCerrar={() => setIniciando(null)} />}
    </div>
  );
}
