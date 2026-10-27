import { api } from './cliente';

const query = (filtros = {}) => {
  const p = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const proyectos = {
  listar: () => api('/proyectos'),
  crear: (datos) => api('/proyectos', { metodo: 'POST', cuerpo: datos }),
  obtener: (pid) => api(`/proyectos/${pid}`),
  actualizar: (pid, datos) => api(`/proyectos/${pid}`, { metodo: 'PATCH', cuerpo: datos }),
  eliminar: (pid) => api(`/proyectos/${pid}`, { metodo: 'DELETE' }),
};

export const miembros = {
  listar: (pid) => api(`/proyectos/${pid}/miembros`),
  agregar: (pid, datos) => api(`/proyectos/${pid}/miembros`, { metodo: 'POST', cuerpo: datos }),
  actualizar: (pid, uid, datos) => api(`/proyectos/${pid}/miembros/${uid}`, { metodo: 'PATCH', cuerpo: datos }),
  quitar: (pid, uid) => api(`/proyectos/${pid}/miembros/${uid}`, { metodo: 'DELETE' }),
};

export const sprints = {
  listar: (pid) => api(`/proyectos/${pid}/sprints`),
  crear: (pid, datos) => api(`/proyectos/${pid}/sprints`, { metodo: 'POST', cuerpo: datos }),
  tablero: (id) => api(`/sprints/${id}/tablero`),
  actualizar: (id, datos) => api(`/sprints/${id}`, { metodo: 'PATCH', cuerpo: datos }),
  iniciar: (id, datos = {}) => api(`/sprints/${id}/iniciar`, { metodo: 'POST', cuerpo: datos }),
  cerrar: (id) => api(`/sprints/${id}/cerrar`, { metodo: 'POST' }),
  eliminar: (id) => api(`/sprints/${id}`, { metodo: 'DELETE' }),
};

export const tareas = {
  listar: (pid, filtros) => api(`/proyectos/${pid}/tareas${query(filtros)}`),
  backlog: (pid) => api(`/proyectos/${pid}/backlog`),
  crear: (pid, datos) => api(`/proyectos/${pid}/tareas`, { metodo: 'POST', cuerpo: datos }),
  obtener: (id) => api(`/tareas/${id}`),
  historial: (id) => api(`/tareas/${id}/historial`),
  actualizar: (id, datos) => api(`/tareas/${id}`, { metodo: 'PATCH', cuerpo: datos }),
  asignar: (id, asignadoId) => api(`/tareas/${id}/asignar`, { metodo: 'PATCH', cuerpo: { asignado_id: asignadoId } }),
  mover: (id, datos) => api(`/tareas/${id}/mover`, { metodo: 'PATCH', cuerpo: datos }),
  eliminar: (id) => api(`/tareas/${id}`, { metodo: 'DELETE' }),
  etiquetar: (id, ids) => api(`/tareas/${id}/etiquetas`, { metodo: 'PUT', cuerpo: { etiquetas: ids } }),
};

export const comentarios = {
  listar: (tareaId) => api(`/tareas/${tareaId}/comentarios`),
  crear: (tareaId, contenido) => api(`/tareas/${tareaId}/comentarios`, { metodo: 'POST', cuerpo: { contenido } }),
  editar: (id, contenido) => api(`/comentarios/${id}`, { metodo: 'PATCH', cuerpo: { contenido } }),
  eliminar: (id) => api(`/comentarios/${id}`, { metodo: 'DELETE' }),
};

export const etiquetas = {
  listar: (pid) => api(`/proyectos/${pid}/etiquetas`),
  crear: (pid, datos) => api(`/proyectos/${pid}/etiquetas`, { metodo: 'POST', cuerpo: datos }),
  eliminar: (pid, eid) => api(`/proyectos/${pid}/etiquetas/${eid}`, { metodo: 'DELETE' }),
};

export const reportes = {
  carga: (pid, sprintId) => api(`/proyectos/${pid}/reportes/carga${query({ sprint: sprintId })}`),
  velocidad: (pid) => api(`/proyectos/${pid}/reportes/velocidad`),
  burndown: (sprintId) => api(`/sprints/${sprintId}/reportes/burndown`),
};
