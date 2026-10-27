const { z, id, fecha, puntos, TIPOS, PRIORIDADES, ESTADOS } = require('../../utils/esquemas');

const crear = z.object({
  titulo: z.string().trim().min(1, 'El título es obligatorio').max(200),
  descripcion: z.string().max(10000).optional(),
  tipo: z.enum(TIPOS).default('tarea'),
  prioridad: z.enum(PRIORIDADES).default('media'),
  puntos: puntos.nullable().optional(),
  asignado_id: id.nullable().optional(),
  sprint_id: id.nullable().optional(),
  padre_id: id.nullable().optional(),
  fecha_limite: fecha.nullable().optional(),
  etiquetas: z.array(id).max(20).optional(),
});

const actualizar = z
  .object({
    titulo: z.string().trim().min(1).max(200),
    descripcion: z.string().max(10000).nullable(),
    tipo: z.enum(TIPOS),
    prioridad: z.enum(PRIORIDADES),
    puntos: puntos.nullable(),
    sprint_id: id.nullable(),
    padre_id: id.nullable(),
    fecha_limite: fecha.nullable(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, 'Envía al menos un campo para actualizar');

const asignar = z.object({
  asignado_id: id.nullable(),
});

const mover = z
  .object({
    estado: z.enum(ESTADOS).optional(),
    orden: z.number().int().min(0).optional(),
  })
  .refine((d) => d.estado !== undefined || d.orden !== undefined, 'Envía estado u orden');

const filtros = z.object({
  asignado: z.union([z.enum(['yo', 'ninguno']), id]).optional(),
  estado: z.enum(ESTADOS).optional(),
  sprint: z.union([z.literal('backlog'), id]).optional(),
  tipo: z.enum(TIPOS).optional(),
  prioridad: z.enum(PRIORIDADES).optional(),
  q: z.string().trim().max(100).optional(),
});

module.exports = { crear, actualizar, asignar, mover, filtros };
