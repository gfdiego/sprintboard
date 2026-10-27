const relativo = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
const UNIDADES = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** "hace 5 minutos", "ayer", "en 3 horas"… */
export function tiempoRelativo(fecha) {
  const segundos = (new Date(fecha).getTime() - Date.now()) / 1000;
  for (const [unidad, tamano] of UNIDADES) {
    if (Math.abs(segundos) >= tamano) return relativo.format(Math.round(segundos / tamano), unidad);
  }
  return 'justo ahora';
}

export function fechaHora(fecha) {
  return new Date(fecha).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Las columnas DATE llegan como 'AAAA-MM-DD'. new Date('2026-10-27') las toma
 * como UTC y en Guatemala mostraría el día anterior, así que se arma en hora local.
 */
export function fechaLocal(ymd) {
  if (!ymd) return null;
  const [a, m, d] = String(ymd).slice(0, 10).split('-').map(Number);
  return new Date(a, m - 1, d);
}

/** "27 oct" o "27 oct 2025" si no es de este año. */
export function fechaCorta(ymd) {
  const f = fechaLocal(ymd);
  if (!f) return '';
  const opciones = { day: 'numeric', month: 'short' };
  if (f.getFullYear() !== new Date().getFullYear()) opciones.year = 'numeric';
  return f.toLocaleDateString('es', opciones);
}

export function hoyYmd() {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
}

/** true si la fecha límite ya pasó. */
export const vencida = (ymd) => Boolean(ymd) && String(ymd).slice(0, 10) < hoyYmd();

export function rangoFechas(inicio, fin) {
  if (!inicio && !fin) return 'Sin fechas';
  return `${inicio ? fechaCorta(inicio) : '¿?'} – ${fin ? fechaCorta(fin) : '¿?'}`;
}

/** "Chrome en Windows" a partir del User-Agent. */
export function describirAgente(agente) {
  if (!agente) return 'Dispositivo desconocido';
  const navegador =
    [
      [/Edg\//, 'Edge'],
      [/OPR\//, 'Opera'],
      [/Firefox\//, 'Firefox'],
      [/Chrome\//, 'Chrome'],
      [/Safari\//, 'Safari'],
      [/PostmanRuntime/, 'Postman'],
      [/Thunder Client/i, 'Thunder Client'],
      [/vscode-restclient/i, 'REST Client'],
      [/curl\//, 'curl'],
    ].find(([re]) => re.test(agente))?.[1] || 'Navegador';
  const sistema = [
    [/Windows/, 'Windows'],
    [/Android/, 'Android'],
    [/iPhone|iPad/, 'iOS'],
    [/Mac OS X/, 'macOS'],
    [/Linux/, 'Linux'],
  ].find(([re]) => re.test(agente))?.[1];
  return sistema ? `${navegador} en ${sistema}` : navegador;
}

export const esMovil = (agente = '') => /Android|iPhone|iPad|Mobile/.test(agente);

export function iniciales(nombre = '') {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}
