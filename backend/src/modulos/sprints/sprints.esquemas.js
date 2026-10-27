const { z, fecha } = require('../../utils/esquemas');

const fechasCoherentes = (d) => !d.fecha_inicio || !d.fecha_fin || d.fecha_fin >= d.fecha_inicio;
const MENSAJE_FECHAS = { message: 'fecha_fin no puede ser anterior a fecha_inicio', path: ['fecha_fin'] };

const crear = z
  .object({
    nombre: z.string().trim().min(1).max(100).optional(),
    objetivo: z.string().trim().max(1000).optional(),
    fecha_inicio: fecha.optional(),
    fecha_fin: fecha.optional(),
  })
  .refine(fechasCoherentes, MENSAJE_FECHAS);

const actualizar = z
  .object({
    nombre: z.string().trim().min(1).max(100),
    objetivo: z.string().trim().max(1000).nullable(),
    fecha_inicio: fecha.nullable(),
    fecha_fin: fecha.nullable(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, 'Envía al menos un campo para actualizar')
  .refine(fechasCoherentes, MENSAJE_FECHAS);

const iniciar = z.object({
  fecha_fin: fecha.optional(),
});

module.exports = { crear, actualizar, iniciar };
