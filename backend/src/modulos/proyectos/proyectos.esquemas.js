const { z } = require('../../utils/esquemas');

const crear = z.object({
  clave: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9]{1,9}$/, 'La clave debe tener de 2 a 10 caracteres, empezar con letra y solo usar letras y números'),
  nombre: z.string().trim().min(2).max(120),
  descripcion: z.string().trim().max(2000).optional(),
});

const actualizar = z
  .object({
    nombre: z.string().trim().min(2).max(120),
    descripcion: z.string().trim().max(2000).nullable(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, 'Envía al menos un campo para actualizar');

module.exports = { crear, actualizar };
