const { z } = require('../../utils/esquemas');

const contenido = z.object({
  contenido: z.string().trim().min(1, 'El comentario no puede estar vacío').max(5000),
});

module.exports = { crear: contenido, editar: contenido };
