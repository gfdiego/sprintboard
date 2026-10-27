import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { reportes as apiReportes } from '../../api/recursos';
import { useProyecto } from '../../contexto/ProyectoContext';
import { useCarga } from '../../hooks/useCarga';
import { COLORES_GRAFICO as C, GraficoBurndown, GraficoCarga, GraficoVelocidad, Leyenda } from '../../componentes/graficos';
import { Alerta, Cargando, Vacio } from '../../componentes/ui';
import { fechaCorta, fechaLocal, rangoFechas } from '../../utils/formato';

/** Tarjeta con título y botón para alternar gráfico / tabla. */
function Tarjeta({ titulo, subtitulo, leyenda, tabla, children }) {
  const [verTabla, setVerTabla] = useState(false);
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">{titulo}</h2>
          {subtitulo && <p className="text-sm text-slate-500">{subtitulo}</p>}
        </div>
        {tabla && (
          <button onClick={() => setVerTabla((v) => !v)} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50">
            {verTabla ? 'Ver gráfico' : 'Ver tabla'}
          </button>
        )}
      </div>
      {!verTabla && leyenda}
      {verTabla ? <div className="overflow-x-auto">{tabla}</div> : children}
    </section>
  );
}

function Tabla({ columnas, filas }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
          {columnas.map((c, i) => (
            <th key={c} className={`py-2 font-medium ${i ? 'text-right' : ''}`}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((f, i) => (
          <tr key={i} className="border-b border-slate-100 last:border-0">
            {f.map((v, j) => (
              <td key={j} className={`py-2 tabular-nums ${j ? 'text-right' : 'text-slate-800'}`}>
                {v}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Cifra({ etiqueta, valor, detalle }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{etiqueta}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{valor}</p>
      {detalle && <p className="text-xs text-slate-500">{detalle}</p>}
    </div>
  );
}

function Burndown({ sprintId }) {
  const { versionTareas } = useProyecto();
  const { datos, error } = useCarga(() => apiReportes.burndown(sprintId), [sprintId, versionTareas]);
  if (error) return <Alerta>{error.message}</Alerta>;
  if (!datos) return <Cargando />;

  const dias = datos.dias.map((d) => ({
    ...d,
    etiqueta: fechaCorta(d.fecha),
    fechaLarga: fechaLocal(d.fecha).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }),
  }));
  const ultimo = [...dias].reverse().find((d) => d.restante != null);
  const restante = ultimo?.restante ?? datos.puntos_totales;
  const hechos = datos.puntos_totales - restante;
  const idealHoy = ultimo?.ideal ?? datos.puntos_totales;
  const diferencia = Math.round((restante - idealHoy) * 10) / 10;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-4">
        <Cifra etiqueta="Puntos del sprint" valor={datos.puntos_totales} />
        <Cifra etiqueta="Completados" valor={hechos} detalle={datos.puntos_totales ? `${Math.round((hechos / datos.puntos_totales) * 100)}%` : undefined} />
        <Cifra etiqueta="Restantes" valor={restante} />
        <Cifra
          etiqueta="Frente al ideal"
          valor={diferencia > 0 ? `+${diferencia}` : diferencia}
          detalle={diferencia > 0 ? '⚠ Atrasado (puntos por encima del ideal)' : diferencia < 0 ? '✓ Adelantado' : 'Al día'}
        />
      </div>
      <Tarjeta
        titulo="Burndown"
        subtitulo={`${datos.sprint.nombre} · ${rangoFechas(datos.sprint.fecha_inicio, datos.sprint.fecha_fin)}`}
        leyenda={
          <Leyenda
            elementos={[
              { etiqueta: 'Puntos restantes', color: C.serie },
              { etiqueta: 'Ritmo ideal', color: C.apagada, punteado: true },
            ]}
          />
        }
        tabla={<Tabla columnas={['Día', 'Restante', 'Ideal']} filas={dias.map((d) => [d.etiqueta, d.restante ?? '—', d.ideal])} />}
      >
        {datos.puntos_totales === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Las tareas del sprint no tienen puntos estimados.</p>
        ) : (
          <GraficoBurndown dias={dias} total={datos.puntos_totales} />
        )}
      </Tarjeta>
    </div>
  );
}

function Carga({ sprintId }) {
  const { pid, versionTareas } = useProyecto();
  const { datos, error } = useCarga(() => apiReportes.carga(pid, sprintId), [pid, sprintId, versionTareas]);
  if (error) return <Alerta>{error.message}</Alerta>;
  if (!datos) return <Cargando />;

  const filas = datos.miembros
    .filter((m) => m.rol !== 'observador' || m.puntos_asignados > 0)
    .map((m) => ({ id: m.id, nombre: m.nombre, asignados: m.puntos_asignados, hechos: m.puntos_hechos, capacidad: m.capacidad_puntos, tareas: m.tareas, sobrecargado: m.sobrecargado }));
  const sobrecargados = filas.filter((f) => f.sobrecargado).length;

  return (
    <Tarjeta
      titulo="Carga del equipo"
      subtitulo={
        <>
          {datos.sprint ? `Tareas de ${datos.sprint.nombre}` : 'Tareas abiertas del proyecto'} · Sin asignar: {datos.sin_asignar.tareas} tareas ({datos.sin_asignar.puntos} pts)
          {sobrecargados > 0 && <span className="font-medium text-red-700"> · ⚠ {sobrecargados} sobrecargado(s)</span>}
        </>
      }
      leyenda={
        <Leyenda
          elementos={[
            { etiqueta: 'Puntos asignados', color: C.serie, forma: 'barra' },
            ...(sobrecargados ? [{ etiqueta: 'Sobrecargado', color: C.critico, forma: 'barra' }] : []),
            { etiqueta: 'Capacidad', color: C.tinta },
          ]}
        />
      }
      tabla={
        <Tabla
          columnas={['Miembro', 'Asignados', 'Hechos', 'Capacidad', 'Estado']}
          filas={filas.map((f) => [f.nombre, f.asignados, f.hechos, f.capacidad, f.sobrecargado ? '⚠ Sobrecargado' : 'OK'])}
        />
      }
    >
      {filas.length ? <GraficoCarga filas={filas} /> : <p className="text-sm text-slate-500">No hay miembros con tareas.</p>}
    </Tarjeta>
  );
}

function Velocidad() {
  const { pid, versionTareas } = useProyecto();
  const { datos, error } = useCarga(() => apiReportes.velocidad(pid), [pid, versionTareas]);
  if (error) return <Alerta>{error.message}</Alerta>;
  if (!datos) return <Cargando />;

  const sprints = datos.sprints.map((s) => ({ id: s.id, nombre: s.nombre, puntos: s.puntos_completados, tareas: s.tareas_completadas }));

  return (
    <Tarjeta
      titulo="Velocidad"
      subtitulo={sprints.length ? `Puntos completados en los últimos ${sprints.length} sprint(s) cerrados · promedio ${datos.promedio} pts` : undefined}
      tabla={sprints.length > 0 && <Tabla columnas={['Sprint', 'Puntos', 'Tareas']} filas={sprints.map((s) => [s.nombre, s.puntos, s.tareas])} />}
    >
      {sprints.length ? (
        <GraficoVelocidad sprints={sprints} promedio={datos.promedio} />
      ) : (
        <p className="py-6 text-center text-sm text-slate-500">Cierra tu primer sprint para ver la velocidad del equipo.</p>
      )}
    </Tarjeta>
  );
}

export default function Reportes() {
  const { sprints } = useProyecto();
  const [params, setParams] = useSearchParams();
  const conDatos = sprints.filter((s) => s.estado !== 'planificado');
  const activo = sprints.find((s) => s.estado === 'activo');
  const pedido = Number(params.get('sprint'));
  const sprintId = conDatos.some((s) => s.id === pedido) ? pedido : (activo || conDatos[0])?.id;

  const elegir = (id) =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      n.set('sprint', id);
      return n;
    });

  return (
    <div className="space-y-6">
      {conDatos.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="sprint-reporte" className="text-sm font-medium text-slate-700">
              Sprint
            </label>
            <select
              id="sprint-reporte"
              value={sprintId}
              onChange={(e) => elegir(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
            >
              {conDatos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} {s.estado === 'activo' ? '(activo)' : '(cerrado)'}
                </option>
              ))}
            </select>
          </div>
          <Burndown sprintId={sprintId} />
          <Carga sprintId={sprintId} />
        </>
      ) : (
        <>
          <Vacio titulo="Aún no hay sprints iniciados">El burndown aparece cuando inicias un sprint. Mientras tanto, esta es la carga de las tareas abiertas.</Vacio>
          <Carga />
        </>
      )}
      <Velocidad />
    </div>
  );
}
