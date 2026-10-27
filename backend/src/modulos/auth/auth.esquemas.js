const { z } = require('../../utils/esquemas');

const correo = z.string().trim().toLowerCase().email('Correo inválido').max(150);

const registro = z.object({
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  correo,
  // bcrypt solo usa los primeros 72 bytes
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72, 'La contraseña no puede superar 72 caracteres')
    .regex(/[A-Za-z]/, 'La contraseña debe incluir al menos una letra')
    .regex(/\d/, 'La contraseña debe incluir al menos un número'),
});

const login = z.object({
  correo,
  password: z.string().min(1, 'La contraseña es obligatoria').max(72),
});

const paramSesion = z.object({ id: z.string().uuid('Id de sesión inválido') });

module.exports = { registro, login, paramSesion };
