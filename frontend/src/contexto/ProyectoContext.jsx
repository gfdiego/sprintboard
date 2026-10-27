import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import * as recursos from '../api/recursos';
import { tieneRol } from '../utils/constantes';

const ProyectoContext = createContext(null);

/**
 * Datos compartidos por todas las pestañas de un proyecto: el proyecto, mi rol,
 * miembros, etiquetas y sprints. `versionTareas` sube cada vez que cambia una
 * tarea, para que el tablero y el backlog se vuelvan a cargar.
 */
export function ProyectoProvider({ pid, children }) {
  const [proyecto, setProyecto] = useState(null);
  const [miembros, setMiembros] = useState([]);
  const [etiquetas, setEtiquetas] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [error, setError] = useState(null);
  const [versionTareas, setVersionTareas] = useState(0);
  const [params, setParams] = useSearchParams();

  const recargarProyecto = useCallback(() => recursos.proyectos.obtener(pid).then(setProyecto), [pid]);
  const recargarMiembros = useCallback(() => recursos.miembros.listar(pid).then(setMiembros), [pid]);
  const recargarEtiquetas = useCallback(() => recursos.etiquetas.listar(pid).then(setEtiquetas), [pid]);
  const recargarSprints = useCallback(() => recursos.sprints.listar(pid).then(setSprints), [pid]);

  useEffect(() => {
    setProyecto(null);
    setError(null);
    Promise.all([recargarProyecto(), recargarMiembros(), recargarEtiquetas(), recargarSprints()]).catch(setError);
  }, [recargarProyecto, recargarMiembros, recargarEtiquetas, recargarSprints]);

  /** Llamar después de crear, editar o mover tareas o sprints. */
  const tareasCambiaron = useCallback(() => {
    setVersionTareas((v) => v + 1);
    recargarSprints().catch(() => {});
    recargarProyecto().catch(() => {});
  }, [recargarSprints, recargarProyecto]);

  const tareaAbierta = params.get('tarea') ? Number(params.get('tarea')) : null;

  const abrirTarea = useCallback(
    (id) =>
      setParams((p) => {
        const nuevos = new URLSearchParams(p);
        if (id) nuevos.set('tarea', id);
        else nuevos.delete('tarea');
        return nuevos;
      }),
    [setParams]
  );

  const valor = useMemo(() => {
    const rol = proyecto?.rol;
    return {
      pid: Number(pid),
      proyecto,
      rol,
      esAdmin: tieneRol(rol, 'admin'),
      puedeEditar: tieneRol(rol, 'miembro'),
      miembros,
      etiquetas,
      sprints,
      error,
      versionTareas,
      tareaAbierta,
      abrirTarea,
      tareasCambiaron,
      recargarProyecto,
      recargarMiembros,
      recargarEtiquetas,
      recargarSprints,
    };
  }, [pid, proyecto, miembros, etiquetas, sprints, error, versionTareas, tareaAbierta, abrirTarea, tareasCambiaron, recargarProyecto, recargarMiembros, recargarEtiquetas, recargarSprints]);

  return <ProyectoContext.Provider value={valor}>{children}</ProyectoContext.Provider>;
}

export function useProyecto() {
  const contexto = useContext(ProyectoContext);
  if (!contexto) throw new Error('useProyecto debe usarse dentro de <ProyectoProvider>');
  return contexto;
}
