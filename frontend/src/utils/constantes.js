// Valores que acepta el backend (backend/src/utils/esquemas.js) con su presentación

export const TIPOS = {
  historia: { nombre: 'Historia', color: 'bg-green-500' },
  tarea: { nombre: 'Tarea', color: 'bg-blue-500' },
  bug: { nombre: 'Bug', color: 'bg-red-500' },
  epica: { nombre: 'Épica', color: 'bg-purple-500' },
  subtarea: { nombre: 'Subtarea', color: 'bg-sky-400' },
};

// De mayor a menor, como se muestran en los selectores
export const PRIORIDADES = {
  critica: { nombre: 'Crítica', color: 'text-red-600', flecha: '⇈' },
  alta: { nombre: 'Alta', color: 'text-orange-500', flecha: '↑' },
  media: { nombre: 'Media', color: 'text-amber-500', flecha: '=' },
  baja: { nombre: 'Baja', color: 'text-blue-500', flecha: '↓' },
  minima: { nombre: 'Mínima', color: 'text-slate-400', flecha: '⇊' },
};

export const ESTADOS = {
  por_hacer: { nombre: 'Por hacer', insignia: 'bg-slate-100 text-slate-700', columna: 'bg-slate-400' },
  en_progreso: { nombre: 'En progreso', insignia: 'bg-blue-100 text-blue-700', columna: 'bg-blue-500' },
  en_revision: { nombre: 'En revisión', insignia: 'bg-amber-100 text-amber-800', columna: 'bg-amber-500' },
  hecho: { nombre: 'Hecho', insignia: 'bg-green-100 text-green-700', columna: 'bg-green-500' },
};

export const ESTADOS_SPRINT = {
  planificado: { nombre: 'Planificado', insignia: 'bg-slate-100 text-slate-600' },
  activo: { nombre: 'Activo', insignia: 'bg-blue-100 text-blue-700' },
  cerrado: { nombre: 'Cerrado', insignia: 'bg-green-100 text-green-700' },
};

export const ROLES = {
  admin: { nombre: 'Admin', descripcion: 'Gestiona miembros, sprints y el proyecto', insignia: 'bg-blue-600 text-white' },
  miembro: { nombre: 'Miembro', descripcion: 'Crea y edita tareas', insignia: 'bg-blue-100 text-blue-700' },
  observador: { nombre: 'Observador', descripcion: 'Solo puede ver', insignia: 'bg-slate-100 text-slate-600' },
};

export const PUNTOS = [1, 2, 3, 5, 8, 13, 21];

export const COLORES_ETIQUETA = ['#6b7280', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

const NIVEL = { observador: 1, miembro: 2, admin: 3 };

/** true si el rol alcanza el mínimo (mismo criterio que el backend). */
export const tieneRol = (rol, minimo) => (NIVEL[rol] || 0) >= NIVEL[minimo];
