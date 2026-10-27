const { z, id, ROLES } = require('../../utils/esquemas');

const agregar = z.object({
  correo: z.string().trim().toLowerCase().email('Correo inválido'),
  rol: z.enum(ROLES).default('miembro'),
  capacidad_puntos: z.number().int().min(0).max(200).default(10),
});

const actualizar = z
  .object({
    rol: z.enum(ROLES),
    capacidad_puntos: z.number().int().min(0).max(200),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, 'Envía rol o capacidad_puntos');

const paramsMiembro = z.object({ pid: id, uid: id });

module.exports = { agregar, actualizar, paramsMiembro };
