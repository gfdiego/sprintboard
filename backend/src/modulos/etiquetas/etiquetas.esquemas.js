const { z, id } = require('../../utils/esquemas');

const crear = z.object({
  nombre: z.string().trim().toLowerCase().min(1).max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color en formato #RRGGBB').default('#6b7280'),
});

const asignarATarea = z.object({
  etiquetas: z.array(id).max(20),
});

const paramsEtiqueta = z.object({ pid: id, eid: id });

module.exports = { crear, asignarATarea, paramsEtiqueta };
