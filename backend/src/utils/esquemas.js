const { z } = require('zod');

// Esquemas reutilizables por varios módulos
const id = z.coerce.number().int().positive();

const paramPid = z.object({ pid: id });
const paramId = z.object({ id });

const fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato AAAA-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Fecha inválida');

const PUNTOS = [1, 2, 3, 5, 8, 13, 21];
const puntos = z
  .number()
  .int()
  .refine((v) => PUNTOS.includes(v), `Los puntos deben ser uno de: ${PUNTOS.join(', ')}`);

const ROLES = ['admin', 'miembro', 'observador'];
const TIPOS = ['historia', 'tarea', 'bug', 'epica', 'subtarea'];
const PRIORIDADES = ['minima', 'baja', 'media', 'alta', 'critica'];
const ESTADOS = ['por_hacer', 'en_progreso', 'en_revision', 'hecho'];

module.exports = { z, id, paramPid, paramId, fecha, puntos, PUNTOS, ROLES, TIPOS, PRIORIDADES, ESTADOS };
