import { Link, NavLink, Outlet, useParams } from 'react-router';
import { ProyectoProvider, useProyecto } from '../../contexto/ProyectoContext';
import DetalleTarea from '../../componentes/tareas/DetalleTarea';
import { RolInsignia } from '../../componentes/insignias';
import { Alerta, Cargando, Vacio } from '../../componentes/ui';

const pestana = ({ isActive }) =>
  `border-b-2 px-1 pb-3 text-sm font-medium transition ${
    isActive ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
  }`;

function Contenido() {
  const { proyecto, error, tareaAbierta, abrirTarea } = useProyecto();

  if (error?.estado === 404) {
    return (
      <Vacio titulo="Proyecto no encontrado" accion={<Link to="/" className="text-sm font-medium text-blue-600 hover:underline">Volver a mis proyectos</Link>}>
        No existe o no eres miembro de este proyecto.
      </Vacio>
    );
  }
  if (error) return <Alerta>{error.message}</Alerta>;
  if (!proyecto) return <Cargando />;

  return (
    <div className="space-y-6">
      <div className="space-y-4 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-800">
            Proyectos
          </Link>
          <span className="text-slate-300">/</span>
          <span className="rounded-md bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">{proyecto.clave}</span>
          <h1 className="text-xl font-semibold text-slate-900">{proyecto.nombre}</h1>
          <RolInsignia rol={proyecto.rol} />
        </div>
        <nav className="flex gap-6">
          <NavLink to="" end className={pestana}>
            Tablero
          </NavLink>
          <NavLink to="backlog" className={pestana}>
            Backlog
          </NavLink>
          <NavLink to="reportes" className={pestana}>
            Reportes
          </NavLink>
          <NavLink to="ajustes" className={pestana}>
            Ajustes
          </NavLink>
        </nav>
      </div>

      <Outlet />

      {tareaAbierta && <DetalleTarea key={tareaAbierta} id={tareaAbierta} alCerrar={() => abrirTarea(null)} />}
    </div>
  );
}

export default function ProyectoLayout() {
  const { pid } = useParams();
  return (
    <ProyectoProvider key={pid} pid={pid}>
      <Contenido />
    </ProyectoProvider>
  );
}
