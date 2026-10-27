import { useEffect, useState } from 'react';
import { tareas as apiTareas } from '../../api/recursos';
import { useAuth } from '../../contexto/AuthContext';
import { useNotificar } from '../../contexto/Notificaciones';
import { useProyecto } from '../../contexto/ProyectoContext';
import { useCarga } from '../../hooks/useCarga';
import Comentarios from './Comentarios';
import Historial from './Historial';
import NuevaTarea from './NuevaTarea';
import { FilaTarea } from './TarjetaTarea';
import { Avatar, Etiqueta, TipoIcono } from '../insignias';
import { Alerta, Boton, Cargando } from '../ui';
import { ESTADOS, PRIORIDADES, PUNTOS, TIPOS } from '../../utils/constantes';
import { fechaHora, tiempoRelativo, vencida } from '../../utils/formato';

const CONTROL =
  'w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-slate-800 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:hover:border-transparent';

function Fila({ etiqueta, children }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-center gap-2">
      <span className="text-xs font-medium text-slate-500">{etiqueta}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Titulo({ tarea, puedeEditar, alGuardar }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(tarea.titulo);

  useEffect(() => setTexto(tarea.titulo), [tarea.titulo]);

  const guardar = () => {
    setEditando(false);
    const limpio = texto.trim();
    if (limpio && limpio !== tarea.titulo) alGuardar({ titulo: limpio });
    else setTexto(tarea.titulo);
  };

  if (editando) {
    return (
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={guardar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') guardar();
          if (e.key === 'Escape') {
            e.stopPropagation();
            setTexto(tarea.titulo);
            setEditando(false);
          }
        }}
        maxLength={200}
        autoFocus
        className="w-full rounded-md border border-blue-500 px-2 py-1 text-xl font-semibold text-slate-900 outline-none ring-2 ring-blue-100"
      />
    );
  }
  return (
    <h2
      onClick={() => puedeEditar && setEditando(true)}
      className={`rounded-md px-2 py-1 text-xl font-semibold text-slate-900 ${puedeEditar ? 'cursor-text hover:bg-slate-100' : ''}`}
    >
      {tarea.titulo}
    </h2>
  );
}

function Descripcion({ tarea, puedeEditar, alGuardar }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(tarea.descripcion || '');

  const guardar = async () => {
    await alGuardar({ descripcion: texto.trim() || null });
    setEditando(false);
  };

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-900">Descripción</h3>
      {editando ? (
        <div className="space-y-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={6}
            autoFocus
            className="block w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <div className="flex gap-2">
            <Boton onClick={guardar} className="!py-1">
              Guardar
            </Boton>
            <Boton variante="fantasma" className="!py-1" onClick={() => (setEditando(false), setTexto(tarea.descripcion || ''))}>
              Cancelar
            </Boton>
          </div>
        </div>
      ) : (
        <div
          onClick={() => puedeEditar && setEditando(true)}
          className={`min-h-12 whitespace-pre-wrap break-words rounded-md px-2 py-1.5 text-sm ${
            tarea.descripcion ? 'text-slate-700' : 'text-slate-400'
          } ${puedeEditar ? 'cursor-text hover:bg-slate-100' : ''}`}
        >
          {tarea.descripcion || (puedeEditar ? 'Agrega una descripción…' : 'Sin descripción')}
        </div>
      )}
    </section>
  );
}

function SelectorEtiquetas({ tarea, puedeEditar, alCambiar }) {
  const { etiquetas } = useProyecto();
  const [abierto, setAbierto] = useState(false);
  const ids = tarea.etiquetas.map((e) => e.id);
  const alternar = (id) => alCambiar(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);

  return (
    <div className="space-y-2 px-2">
      <div className="flex flex-wrap gap-1">
        {tarea.etiquetas.length === 0 && <span className="text-sm text-slate-400">Ninguna</span>}
        {tarea.etiquetas.map((et) => (
          <Etiqueta key={et.id} etiqueta={et} alQuitar={puedeEditar ? () => alternar(et.id) : undefined} />
        ))}
        {puedeEditar && etiquetas.length > 0 && (
          <button onClick={() => setAbierto((a) => !a)} className="rounded-full border border-dashed border-slate-300 px-2 text-xs text-slate-500 hover:border-slate-400">
            {abierto ? 'Listo' : '+ Agregar'}
          </button>
        )}
      </div>
      {abierto && (
        <div className="flex flex-wrap gap-1 rounded-md border border-slate-200 p-2">
          {etiquetas
            .filter((et) => !ids.includes(et.id))
            .map((et) => (
              <button key={et.id} onClick={() => alternar(et.id)} className="opacity-70 hover:opacity-100">
                <Etiqueta etiqueta={et} />
              </button>
            ))}
          {etiquetas.every((et) => ids.includes(et.id)) && <span className="text-xs text-slate-400">Ya tiene todas</span>}
        </div>
      )}
    </div>
  );
}

export default function DetalleTarea({ id, alCerrar }) {
  const { usuario } = useAuth();
  const { miembros, sprints, puedeEditar, esAdmin, versionTareas, tareasCambiaron, abrirTarea } = useProyecto();
  const notificar = useNotificar();
  const { datos: tarea, error, setDatos, recargar } = useCarga(() => apiTareas.obtener(id), [id, versionTareas]);
  const [pestana, setPestana] = useState('comentarios');
  const [versionHistorial, setVersionHistorial] = useState(0);
  const [creandoHija, setCreandoHija] = useState(false);

  useEffect(() => {
    const alPresionar = (e) => e.key === 'Escape' && !creandoHija && alCerrar();
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [alCerrar, creandoHija]);

  /** Ejecuta un cambio, actualiza la vista y avisa al tablero/backlog. */
  const aplicar = async (promesa, combinar = (r) => r) => {
    try {
      const respuesta = await promesa;
      setDatos((prev) => ({ ...prev, ...combinar(respuesta) }));
      if (respuesta?.advertencia) notificar(respuesta.advertencia, 'advertencia');
      setVersionHistorial((v) => v + 1);
      tareasCambiaron();
    } catch (err) {
      notificar(err.message, 'error');
      recargar();
    }
  };

  const actualizar = (cambios) => aplicar(apiTareas.actualizar(id, cambios));

  const eliminar = async () => {
    const hijas = tarea.hijas.filter((h) => h.tipo === 'subtarea').length;
    const extra = hijas ? ` También se eliminarán sus ${hijas} subtarea(s).` : '';
    if (!window.confirm(`¿Eliminar ${tarea.clave}?${extra} Esta acción no se puede deshacer.`)) return;
    try {
      await apiTareas.eliminar(id);
      notificar(`${tarea.clave} eliminada`);
      tareasCambiaron();
      alCerrar();
    } catch (err) {
      notificar(err.message, 'error');
    }
  };

  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notificar('Enlace copiado');
    } catch {
      notificar('No se pudo copiar el enlace', 'error');
    }
  };

  const puedeEliminar = tarea && puedeEditar && (esAdmin || tarea.reportador.id === usuario.id);
  const sprintsDisponibles = sprints.filter((s) => s.estado !== 'cerrado' || s.id === tarea?.sprint_id);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()}>
      <aside role="dialog" aria-label="Detalle de la tarea" className="flex h-full w-full max-w-4xl flex-col bg-white shadow-2xl">
        <header className="flex items-center gap-2 border-b border-slate-200 px-5 py-3">
          {tarea && (
            <>
              {tarea.padre && (
                <>
                  <button onClick={() => abrirTarea(tarea.padre.id)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-700">
                    <TipoIcono tipo={tarea.padre.tipo} />
                    {tarea.padre.clave}
                  </button>
                  <span className="text-slate-300">/</span>
                </>
              )}
              <TipoIcono tipo={tarea.tipo} />
              <span className="text-sm font-medium text-slate-600">{tarea.clave}</span>
            </>
          )}
          <div className="ml-auto flex items-center gap-1">
            <Boton variante="fantasma" className="!px-2" onClick={copiarEnlace}>
              Copiar enlace
            </Boton>
            {puedeEliminar && (
              <Boton variante="fantasma" className="!px-2 text-red-600 hover:!bg-red-50" onClick={eliminar}>
                Eliminar
              </Boton>
            )}
            <button onClick={alCerrar} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Cerrar">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="p-5">
              <Alerta>{error.estado === 404 ? 'Esta tarea ya no existe.' : error.message}</Alerta>
            </div>
          )}
          {!tarea && !error && <Cargando />}
          {tarea && (
            <div className="grid gap-8 p-5 lg:grid-cols-[1fr_17rem]">
              <div className="min-w-0 space-y-6">
                <Titulo tarea={tarea} puedeEditar={puedeEditar} alGuardar={actualizar} />
                <Descripcion key={tarea.descripcion} tarea={tarea} puedeEditar={puedeEditar} alGuardar={actualizar} />

                {tarea.tipo !== 'subtarea' && (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {tarea.tipo === 'epica' ? 'Tareas de la épica' : 'Subtareas'}
                        {tarea.hijas.length > 0 && (
                          <span className="ml-2 font-normal text-slate-500">
                            {tarea.hijas.filter((h) => h.estado === 'hecho').length}/{tarea.hijas.length} hechas
                            {tarea.tipo === 'epica' && ` · ${tarea.puntos_hijas} pts`}
                          </span>
                        )}
                      </h3>
                      {puedeEditar && (
                        <Boton variante="fantasma" className="!px-2 !py-1" onClick={() => setCreandoHija(true)}>
                          + Agregar
                        </Boton>
                      )}
                    </div>
                    {tarea.hijas.length > 0 && (
                      <>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${(tarea.hijas.filter((h) => h.estado === 'hecho').length / tarea.hijas.length) * 100}%` }}
                          />
                        </div>
                        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                          {tarea.hijas.map((h) => (
                            <FilaTarea key={h.id} tarea={h} alAbrir={abrirTarea} />
                          ))}
                        </div>
                      </>
                    )}
                  </section>
                )}

                <section className="space-y-4">
                  <div className="flex gap-4 border-b border-slate-200">
                    {[
                      ['comentarios', `Comentarios${tarea.total_comentarios ? ` (${tarea.total_comentarios})` : ''}`],
                      ['historial', 'Historial'],
                    ].map(([v, texto]) => (
                      <button
                        key={v}
                        onClick={() => setPestana(v)}
                        className={`-mb-px border-b-2 pb-2 text-sm font-medium ${
                          pestana === v ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {texto}
                      </button>
                    ))}
                  </div>
                  {pestana === 'comentarios' ? (
                    <Comentarios tareaId={id} alCambiar={tareasCambiaron} />
                  ) : (
                    <Historial tareaId={id} version={versionHistorial} />
                  )}
                </section>
              </div>

              <div className="space-y-5">
                <select
                  value={tarea.estado}
                  disabled={!puedeEditar}
                  onChange={(e) => aplicar(apiTareas.mover(id, { estado: e.target.value }))}
                  className={`w-full rounded-lg px-3 py-2 text-sm font-semibold ${ESTADOS[tarea.estado].insignia} border-0 focus:ring-2 focus:ring-blue-200`}
                  aria-label="Estado"
                >
                  {Object.entries(ESTADOS).map(([v, e]) => (
                    <option key={v} value={v}>
                      {e.nombre}
                    </option>
                  ))}
                </select>

                <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                  <Fila etiqueta="Asignado">
                    <div className="flex items-center gap-1">
                      <Avatar usuario={tarea.asignado} tamano="size-6" texto="text-[10px]" />
                      <select
                        value={tarea.asignado_id ?? ''}
                        disabled={!puedeEditar}
                        onChange={(e) => aplicar(apiTareas.asignar(id, e.target.value ? Number(e.target.value) : null))}
                        className={CONTROL}
                      >
                        <option value="">Sin asignar</option>
                        {miembros.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    {puedeEditar && tarea.asignado_id !== usuario.id && (
                      <button onClick={() => aplicar(apiTareas.asignar(id, usuario.id))} className="px-2 text-xs text-blue-600 hover:underline">
                        Asignarme
                      </button>
                    )}
                  </Fila>
                  <Fila etiqueta="Prioridad">
                    <select value={tarea.prioridad} disabled={!puedeEditar} onChange={(e) => actualizar({ prioridad: e.target.value })} className={CONTROL}>
                      {Object.entries(PRIORIDADES).map(([v, p]) => (
                        <option key={v} value={v}>
                          {p.flecha} {p.nombre}
                        </option>
                      ))}
                    </select>
                  </Fila>
                  <Fila etiqueta="Tipo">
                    <select value={tarea.tipo} disabled={!puedeEditar} onChange={(e) => actualizar({ tipo: e.target.value })} className={CONTROL}>
                      {Object.entries(TIPOS)
                        .filter(([v]) => (tarea.padre_id ? v !== 'epica' : v !== 'subtarea') || v === tarea.tipo)
                        .map(([v, t]) => (
                          <option key={v} value={v}>
                            {t.nombre}
                          </option>
                        ))}
                    </select>
                  </Fila>
                  <Fila etiqueta="Puntos">
                    {tarea.tipo === 'epica' ? (
                      <span className="px-2 text-sm text-slate-600">{tarea.puntos_hijas} (suma de sus hijas)</span>
                    ) : (
                      <select
                        value={tarea.puntos ?? ''}
                        disabled={!puedeEditar}
                        onChange={(e) => actualizar({ puntos: e.target.value ? Number(e.target.value) : null })}
                        className={CONTROL}
                      >
                        <option value="">Sin estimar</option>
                        {PUNTOS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    )}
                  </Fila>
                  <Fila etiqueta="Sprint">
                    <select
                      value={tarea.sprint_id ?? ''}
                      disabled={!puedeEditar}
                      onChange={(e) => actualizar({ sprint_id: e.target.value ? Number(e.target.value) : null })}
                      className={CONTROL}
                    >
                      <option value="">Backlog</option>
                      {sprintsDisponibles.map((s) => (
                        <option key={s.id} value={s.id} disabled={s.estado === 'cerrado'}>
                          {s.nombre} {s.estado === 'activo' ? '(activo)' : s.estado === 'cerrado' ? '(cerrado)' : ''}
                        </option>
                      ))}
                    </select>
                  </Fila>
                  <Fila etiqueta="Fecha límite">
                    <input
                      type="date"
                      value={tarea.fecha_limite || ''}
                      disabled={!puedeEditar}
                      onChange={(e) => actualizar({ fecha_limite: e.target.value || null })}
                      className={`${CONTROL} ${tarea.estado !== 'hecho' && vencida(tarea.fecha_limite) ? '!text-red-600' : ''}`}
                    />
                  </Fila>
                  <Fila etiqueta="Etiquetas">
                    <SelectorEtiquetas
                      tarea={tarea}
                      puedeEditar={puedeEditar}
                      alCambiar={(ids) => aplicar(apiTareas.etiquetar(id, ids), (lista) => ({ etiquetas: lista }))}
                    />
                  </Fila>
                </div>

                <div className="space-y-1 px-1 text-xs text-slate-500">
                  <p className="flex items-center gap-1.5">
                    Creada por <Avatar usuario={tarea.reportador} tamano="size-5" texto="text-[9px]" /> {tarea.reportador.nombre}
                  </p>
                  <p title={fechaHora(tarea.creado_en)}>Creada {tiempoRelativo(tarea.creado_en)}</p>
                  <p title={fechaHora(tarea.actualizado_en)}>Actualizada {tiempoRelativo(tarea.actualizado_en)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {tarea && (
        <NuevaTarea
          abierto={creandoHija}
          alCerrar={() => setCreandoHija(false)}
          iniciales={{
            tipo: tarea.tipo === 'epica' ? 'historia' : 'subtarea',
            padre_id: tarea.id,
            sprint_id: tarea.tipo === 'epica' ? null : tarea.sprint_id,
          }}
        />
      )}
    </div>
  );
}
