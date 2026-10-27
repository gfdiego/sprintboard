const { z, id } = require('../../utils/esquemas');

const filtrosCarga = z.object({
  sprint: id.optional(),
});

module.exports = { filtrosCarga };
