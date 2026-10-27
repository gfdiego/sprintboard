import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { sprints as apiSprints, tareas as apiTareas } from '../../api/recursos';
import { useAuth } from '../../contexto/AuthContext';
import { useNotificar } from '../../contexto/Notificaciones';
import { useProyecto } from '../../contexto/ProyectoContext';
import { useCarga } from '../../hooks/useCarga';
import NuevaTarea from '../../componentes/tareas/NuevaTarea';
import { TarjetaTarea } from '../../componentes/tareas/TarjetaTarea';
import { Avatar } from '../../componentes/insignias';
import { Alerta, Boton, Cargando, Vacio } from '../../componentes/ui';
import { ESTADOS, TIPOS } from '../../utils/constantes';
import { fechaLocal, rangoFechas } from '../../utils/formato';

function diasRestantes(fin) {
  const f = fechaLocal(fin);
  if (!f) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((f - hoy) / 86400000);
}

function Encabezado({ sprint, alCrear, alCerrar, cerrando }) {
  const { puedeEditar, esAdmin } = useProyecto();
  const dias = diasRestantes(sprint.fecha_fin);
  const progreso = sprint.puntos_totales ? Math.round((sprint.puntos_hechos / sprint.puntos_totales) * 100) : 0;

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">{sprint.nombre}</h2>
          <span className="text-sm text-slate-500">{rangoFechas(sprint.fecha_inicio, sprint.fecha_fin)}</span>
          {dias != null && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${dias < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
              {dias < 0 ? `Vencido hace ${-dias} d` : dias === 0 ? 'Termina hoy' : `${dias} días restantes`}
            </span>
          )}
        </div>
        {sprint.objetivo && <p className="text-sm text-slate-600">🎯 {sprint.objetivo}</p>}
        <div className="flex items-center gap-2 pt-1">
          <div className="h-2 w-48 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full bg-green-500 transition-all" style={{ width: `${progreso}%` }} />
          </div>
          <span className="text-xs text-slate-500">
            {sprint.puntos_hechos}/{sprint.puntos_totales} pts · {sprint.tareas_hechas}/{sprint.total_tareas} tareas
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        {puedeEditar && <Boton onClick={alCrear}>+ Crear tarea</Boton>}
        {esAdmin && (
          <Boton variante="secundario" onClick={alCerrar} cargando={cerrando}>
            Cerrar sprint
          </Boton>
        )}
      </div>
    </div>
  );
}

export default function Tablero() {
  const { proyecto, puedeEditar, esAdmin, miembros, versionTareas, abrirTarea, tareasCambiaron } = useProyecto();
  const { usuario } = useAuth();
  const notificar = useNotificar();
  const sprintId = proyecto.sprint_activo?.id;

  const { datos, error, recargar, setDatos } = useCarga(
    () => (sprintId ? apiSprints.tablero(sprintId) : Promise.resolve(null)),
    [sprintId, versionTareas]
  );

  const [busqueda, setBusqueda] = useState('');
  const [personas, setPersonas] = useState([]);
  const [tipo, setTipo] = useState('');
  const [creando, setCreando] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [arrastrada, setArrastrada] = useState(null);
  const [destino, setDestino] = useState(null); // { estado, indice }

  const pasaFiltros = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (t) =>
      (!q || t.titulo.toLowerCase().includes(q) || t.clave.toLowerCase().includes(q)) &&
      (!personas.length || personas.includes(t.asignado_id ?? 0)) &&
      (!tipo || t.tipo === tipo);
  }, [busqueda, personas, tipo]);

  const alternarPersona = (id) => setPersonas((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  if (!sprintId) {
    return (
      <Vacio
        titulo="No hay un sprint activo"
        accion={
          <Link to={`/proyectos/${proyecto.id}/backlog`} className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Ir al backlog
          </Link>
        }
      >
        {esAdmin
          ? 'Planifica un sprint en el backlog, agrégale tareas e inícialo para verlo aquí.'
          : 'Cuando un admin inicie un sprint, sus tareas aparecerán en este tablero.'}
      </Vacio>
    );
  }
  if (error) return <Alerta>{error.message}</Alerta>;
  if (!datos) return <Cargando />;

  const cerrarSprint = async () => {
    const pendientes = datos.sprint.total_tareas - datos.sprint.tareas_hechas;
    const aviso = pendientes ? `\n\nLas ${pendientes} tarea(s) sin terminar volverán al backlog.` : '';
    if (!window.confirm(`¿Cerrar ${datos.sprint.nombre}?${aviso}`)) return;
    setCerrando(true);
    try {
      const r = await apiSprints.cerrar(sprintId);
      notificar(
        r.tareas_devueltas_al_backlog
          ? `${r.nombre} cerrado. ${r.tareas_devueltas_al_backlog} tarea(s) volvieron al backlog.`
          : `${r.nombre} cerrado. ¡Todo terminado!`
      );
      tareasCambiaron();
    } catch (err) {
      notificar(err.message, 'error');
    } finally {
      setCerrando(false);
    }
  };

  // ----- Arrastrar y soltar -----

  /** Calcula en qué posición de la columna caería la tarjeta según la altura del cursor. */
  const alPasarPor = (estado) => (e) => {
    if (!arrastrada) return;
    e.preventDefault();
    const tarjetas = [...e.currentTarget.querySelectorAll('[data-tarea]')].filter((el) => Number(el.dataset.tarea) !== arrastrada.id);
    let indice = tarjetas.length;
    for (let i = 0; i < tarjetas.length; i++) {
      const caja = tarjetas[i].getBoundingClientRect();
      if (e.clientY < caja.top + caja.height / 2) {
        indice = i;
        break;
      }
    }
    if (destino?.estado !== estado || destino?.indice !== indice) setDestino({ estado, indice });
  };

  const terminarArrastre = () => {
    setArrastrada(null);
    setDestino(null);
  };

  const alSoltar = async (e) => {
    e.preventDefault();
    const tarea = arrastrada;
    const lugar = destino;
    terminarArrastre();
    if (!tarea || !lugar) return;

    const visibles = datos.columnas[lugar.estado].filter((t) => t.id !== tarea.id && pasaFiltros(t));
    const original = datos.columnas[tarea.estado].filter(pasaFiltros);
    const mismaPosicion = tarea.estado === lugar.estado && original.findIndex((t) => t.id === tarea.id) === lugar.indice;
    if (mismaPosicion) return;

    // Si cae antes de otra tarjeta toma su orden (el backend corre las demás); si cae al final, va al final
    const siguiente = visibles[lugar.indice];
    const cuerpo = { estado: lugar.estado, ...(siguiente ? { orden: siguiente.orden } : {}) };

    // Actualización inmediata en pantalla
    setDatos((d) => {
      const columnas = Object.fromEntries(Object.entries(d.columnas).map(([k, lista]) => [k, lista.filter((t) => t.id !== tarea.id)]));
      const destinoLista = columnas[lugar.estado];
      const pos = siguiente ? destinoLista.findIndex((t) => t.id === siguiente.id) : destinoLista.length;
      destinoLista.splice(pos, 0, { ...tarea, estado: lugar.estado });
      return { ...d, columnas };
    });

    try {
      await apiTareas.mover(tarea.id, cuerpo);
      if (tarea.estado !== lugar.estado) tareasCambiaron();
    } catch (err) {
      notificar(err.message, 'error');
      recargar();
    }
  };

  const conAsignado = new Set(Object.values(datos.columnas).flat().map((t) => t.asignado_id ?? 0));
  const personasFiltro = [...miembros.filter((m) => conAsignado.has(m.id)), ...(conAsignado.has(0) ? [{ id: 0, nombre: 'Sin asignar' }] : [])];

  return (
    <div className="space-y-5">
      <Encabezado sprint={datos.sprint} alCrear={() => setCreando(true)} alCerrar={cerrarSprint} cerrando={cerrando} />

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar en el tablero…"
          className="w-56 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <div className="flex items-center -space-x-1">
          {personasFiltro.map((m) => (
            <button
              key={m.id}
              onClick={() => alternarPersona(m.id)}
              aria-pressed={personas.includes(m.id)}
              title={m.nombre}
              className={`rounded-full ring-2 transition ${personas.includes(m.id) ? 'z-10 ring-blue-500' : 'ring-white hover:z-10'}`}
            >
              <Avatar usuario={m.id ? m : null} tamano="size-8" texto="text-xs" />
            </button>
          ))}
        </div>
        <button
          onClick={() => setPersonas((p) => (p.length === 1 && p[0] === usuario.id ? [] : [usuario.id]))}
          className={`rounded-lg border px-3 py-1.5 text-sm ${
            personas.length === 1 && personas[0] === usuario.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          Solo mis tareas
        </button>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">
          <option value="">Todos los tipos</option>
          {Object.entries(TIPOS).map(([v, t]) => (
            <option key={v} value={v}>
              {t.nombre}
            </option>
          ))}
        </select>
        {(busqueda || personas.length > 0 || tipo) && (
          <button onClick={() => (setBusqueda(''), setPersonas([]), setTipo(''))} className="text-sm text-slate-500 hover:text-slate-800">
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="grid min-w-[60rem] grid-cols-4 gap-4">
          {Object.entries(ESTADOS).map(([estado, info]) => {
            const lista = datos.columnas[estado].filter(pasaFiltros);
            const puntos = lista.reduce((s, t) => s + (t.puntos || 0), 0);
            const esDestino = destino?.estado === estado;
            const visibles = lista.filter((t) => t.id !== arrastrada?.id);
            return (
              <section
                key={estado}
                onDragOver={alPasarPor(estado)}
                onDrop={alSoltar}
                className={`flex min-h-[24rem] flex-col rounded-xl bg-slate-100/80 p-2 transition ${esDestino ? 'ring-2 ring-blue-300' : ''}`}
              >
                <header className="flex items-center gap-2 px-2 pb-2 pt-1">
                  <span className={`size-2 rounded-full ${info.columna}`} />
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{info.nombre}</h3>
                  <span className="text-xs text-slate-400">{lista.length}</span>
                  {puntos > 0 && <span className="ml-auto text-xs text-slate-400">{puntos} pts</span>}
                </header>
                <div className="flex flex-1 flex-col gap-2">
                  {lista.map((t) => (
                    <div key={t.id} data-tarea={t.id}>
                      {esDestino && visibles[destino.indice]?.id === t.id && <div className="mb-2 h-1 rounded-full bg-blue-500" />}
                      <TarjetaTarea
                        tarea={t}
                        alAbrir={abrirTarea}
                        arrastrable={puedeEditar}
                        alEmpezarArrastre={setArrastrada}
                        alTerminarArrastre={terminarArrastre}
                        fantasma={arrastrada?.id === t.id}
                      />
                    </div>
                  ))}
                  {esDestino && destino.indice >= visibles.length && <div className="h-1 rounded-full bg-blue-500" />}
                  {lista.length === 0 && !esDestino && (
                    <p className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                      {puedeEditar ? 'Arrastra tareas aquí' : 'Sin tareas'}
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <NuevaTarea abierto={creando} alCerrar={() => setCreando(false)} iniciales={{ sprint_id: sprintId }} />
    </div>
  );
}
