import { useEffect, useRef, useState } from 'react';

// Colores de los gráficos (paleta validada: serie 1 sobre superficie blanca)
const C = {
  serie: '#7a5234',
  critico: '#d03b3b',
  tinta: '#2a211b',
  secundaria: '#52514e',
  apagada: '#898781',
  rejilla: '#e1e0d9',
  base: '#c3c2b7',
  superficie: '#ffffff',
};

/** Ancho real del contenedor, para dibujar el SVG a escala 1:1 (texto nítido). */
function useAncho() {
  const ref = useRef(null);
  const [ancho, setAncho] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver(([e]) => setAncho(Math.floor(e.contentRect.width)));
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, ancho];
}

/** Escala de "bonitos" valores para el eje (0, 5, 10…). */
function marcas(maximo, cantidad = 4) {
  if (maximo <= 0) return [0, 1];
  const paso = Math.pow(10, Math.floor(Math.log10(maximo / cantidad)));
  const multiplo = [1, 2, 5, 10].find((m) => (maximo / cantidad) <= m * paso) * paso;
  const lista = [];
  for (let v = 0; v <= maximo + multiplo * 0.001; v += multiplo) lista.push(Math.round(v * 100) / 100);
  if (lista[lista.length - 1] < maximo) lista.push(lista[lista.length - 1] + multiplo);
  return lista;
}

function Tooltip({ x, y, ancho, children }) {
  const izquierda = Math.min(Math.max(x + 12, 0), ancho - 180);
  return (
    <div
      className="pointer-events-none absolute z-10 w-44 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
      style={{ left: izquierda, top: Math.max(y - 10, 0) }}
    >
      {children}
    </div>
  );
}

function FilaTooltip({ color, punteado, etiqueta, valor }) {
  return (
    <p className="flex items-center gap-2 text-slate-600">
      <svg width="14" height="4" aria-hidden="true">
        <line x1="0" y1="2" x2="14" y2="2" stroke={color} strokeWidth="2" strokeDasharray={punteado ? '3 3' : undefined} />
      </svg>
      {etiqueta}
      <span className="ml-auto font-semibold text-slate-900">{valor}</span>
    </p>
  );
}

export function Leyenda({ elementos }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-slate-600">
      {elementos.map((e) => (
        <span key={e.etiqueta} className="flex items-center gap-1.5">
          <svg width="18" height="8" aria-hidden="true">
            {e.forma === 'barra' ? (
              <rect x="2" y="1" width="14" height="6" rx="2" fill={e.color} />
            ) : (
              <line x1="0" y1="4" x2="18" y2="4" stroke={e.color} strokeWidth="2" strokeDasharray={e.punteado ? '4 3' : undefined} />
            )}
          </svg>
          {e.etiqueta}
        </span>
      ))}
    </div>
  );
}

/**
 * Burndown: puntos restantes por día (línea real) frente a la línea ideal.
 * dias = [{ fecha, etiqueta, restante | null, ideal }]
 */
export function GraficoBurndown({ dias, total }) {
  const [ref, ancho] = useAncho();
  const [hover, setHover] = useState(null);
  const alto = 280;
  const m = { arriba: 16, derecha: 56, abajo: 28, izquierda: 36 };
  const w = Math.max(ancho - m.izquierda - m.derecha, 10);
  const h = alto - m.arriba - m.abajo;
  const ejeY = marcas(Math.max(total, 1));
  const maxY = ejeY[ejeY.length - 1];
  const x = (i) => m.izquierda + (dias.length > 1 ? (i / (dias.length - 1)) * w : w / 2);
  const y = (v) => m.arriba + h - (v / maxY) * h;

  const reales = dias.map((d, i) => ({ ...d, i })).filter((d) => d.restante != null);
  const lineaReal = reales.map((d, j) => `${j ? 'L' : 'M'}${x(d.i)},${y(d.restante)}`).join(' ');
  const lineaIdeal = dias.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.ideal)}`).join(' ');
  const ultimo = reales[reales.length - 1];
  const cadaN = Math.max(1, Math.ceil(dias.length / Math.max(Math.floor(w / 56), 1)));

  const alMover = (e) => {
    const caja = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - caja.left;
    const i = Math.round(((px - m.izquierda) / w) * (dias.length - 1));
    setHover(i >= 0 && i < dias.length ? i : null);
  };

  return (
    <div ref={ref} className="relative">
      {ancho > 0 && (
        <svg width={ancho} height={alto} role="img" aria-label={`Burndown: ${total} puntos al inicio`} onMouseMove={alMover} onMouseLeave={() => setHover(null)}>
          {ejeY.map((v) => (
            <g key={v}>
              <line x1={m.izquierda} x2={m.izquierda + w} y1={y(v)} y2={y(v)} stroke={v === 0 ? C.base : C.rejilla} strokeWidth="1" />
              <text x={m.izquierda - 8} y={y(v)} dy="0.32em" textAnchor="end" fontSize="11" fill={C.apagada}>
                {v}
              </text>
            </g>
          ))}
          {dias.map((d, i) =>
            i % cadaN === 0 || i === dias.length - 1 ? (
              <text key={d.fecha} x={x(i)} y={alto - 8} textAnchor="middle" fontSize="11" fill={C.apagada}>
                {d.etiqueta}
              </text>
            ) : null
          )}

          <path d={lineaIdeal} fill="none" stroke={C.apagada} strokeWidth="2" strokeDasharray="5 4" />
          {lineaReal && <path d={lineaReal} fill="none" stroke={C.serie} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}

          {/* Etiquetas directas al final de cada línea */}
          <text x={x(dias.length - 1) + 6} y={y(dias[dias.length - 1].ideal)} dy="0.32em" fontSize="11" fill={C.secundaria}>
            Ideal
          </text>
          {ultimo && (
            <>
              <circle cx={x(ultimo.i)} cy={y(ultimo.restante)} r="4.5" fill={C.serie} stroke={C.superficie} strokeWidth="2" />
              <text x={x(ultimo.i) + 8} y={Math.max(y(ultimo.restante) - 10, m.arriba + 4)} fontSize="11" fontWeight="600" fill={C.tinta}>
                {ultimo.restante} pts
              </text>
            </>
          )}

          {hover != null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={m.arriba} y2={m.arriba + h} stroke={C.base} strokeWidth="1" />
              {dias[hover].restante != null && <circle cx={x(hover)} cy={y(dias[hover].restante)} r="5" fill={C.serie} stroke={C.superficie} strokeWidth="2" />}
              <circle cx={x(hover)} cy={y(dias[hover].ideal)} r="4" fill={C.apagada} stroke={C.superficie} strokeWidth="2" />
            </g>
          )}
        </svg>
      )}
      {hover != null && (
        <Tooltip x={x(hover)} y={m.arriba} ancho={ancho}>
          <p className="mb-1 font-semibold text-slate-900">{dias[hover].fechaLarga}</p>
          <FilaTooltip color={C.serie} etiqueta="Restante" valor={dias[hover].restante ?? '—'} />
          <FilaTooltip color={C.apagada} punteado etiqueta="Ideal" valor={dias[hover].ideal} />
        </Tooltip>
      )}
    </div>
  );
}

/**
 * Carga por miembro: barra de puntos asignados con una marca en su capacidad.
 * filas = [{ id, nombre, asignados, hechos, capacidad, sobrecargado }]
 */
export function GraficoCarga({ filas }) {
  const [ref, ancho] = useAncho();
  const [hover, setHover] = useState(null);
  const alturaFila = 40;
  const m = { izquierda: 132, derecha: 120, arriba: 8 };
  const w = Math.max(ancho - m.izquierda - m.derecha, 10);
  const maximo = Math.max(...filas.map((f) => Math.max(f.asignados, f.capacidad)), 1);
  const ejeX = marcas(maximo);
  const maxX = ejeX[ejeX.length - 1];
  const x = (v) => m.izquierda + (v / maxX) * w;
  const alto = m.arriba + filas.length * alturaFila + 24;

  return (
    <div ref={ref} className="relative">
      {ancho > 0 && (
        <svg width={ancho} height={alto} role="img" aria-label="Carga de trabajo por miembro">
          {ejeX.map((v) => (
            <g key={v}>
              <line x1={x(v)} x2={x(v)} y1={m.arriba} y2={alto - 24} stroke={v === 0 ? C.base : C.rejilla} />
              <text x={x(v)} y={alto - 8} textAnchor="middle" fontSize="11" fill={C.apagada}>
                {v}
              </text>
            </g>
          ))}
          {filas.map((f, i) => {
            const cy = m.arriba + i * alturaFila + alturaFila / 2;
            const color = f.sobrecargado ? C.critico : C.serie;
            const largo = Math.max(x(f.asignados) - m.izquierda, f.asignados ? 4 : 0);
            return (
              <g key={f.id} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x="0" y={cy - alturaFila / 2} width={ancho} height={alturaFila} fill={hover === i ? '#f2ece2' : 'transparent'} />
                <text x={m.izquierda - 10} y={cy} dy="0.32em" textAnchor="end" fontSize="12" fill={C.tinta}>
                  {f.nombre.length > 18 ? `${f.nombre.slice(0, 17)}…` : f.nombre}
                </text>
                {largo > 0 && <rect x={m.izquierda} y={cy - 7} width={largo} height="14" rx="4" fill={color} />}
                {/* Marca de capacidad */}
                <line x1={x(f.capacidad)} x2={x(f.capacidad)} y1={cy - 12} y2={cy + 12} stroke={C.tinta} strokeWidth="2" strokeLinecap="round" />
                <text x={m.izquierda + w + 12} y={cy} dy="0.32em" fontSize="12" fill={f.sobrecargado ? C.critico : C.secundaria} fontWeight={f.sobrecargado ? 600 : 400}>
                  {f.sobrecargado ? '⚠ ' : ''}
                  {f.asignados}/{f.capacidad} pts
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {hover != null && (
        <Tooltip x={x(filas[hover].asignados)} y={m.arriba + hover * alturaFila + alturaFila} ancho={ancho}>
          <p className="mb-1 font-semibold text-slate-900">{filas[hover].nombre}</p>
          <FilaTooltip color={filas[hover].sobrecargado ? C.critico : C.serie} etiqueta="Asignados" valor={`${filas[hover].asignados} pts`} />
          <FilaTooltip color={C.tinta} etiqueta="Capacidad" valor={`${filas[hover].capacidad} pts`} />
          <p className="mt-1 text-slate-500">
            {filas[hover].hechos} pts hechos · {filas[hover].tareas} tareas
          </p>
          {filas[hover].sobrecargado && <p className="mt-1 font-medium text-red-700">⚠ Sobrecargado</p>}
        </Tooltip>
      )}
    </div>
  );
}

/**
 * Velocidad: puntos completados por sprint cerrado, con la línea del promedio.
 * sprints = [{ id, nombre, puntos }]
 */
export function GraficoVelocidad({ sprints, promedio }) {
  const [ref, ancho] = useAncho();
  const [hover, setHover] = useState(null);
  const alto = 240;
  const m = { arriba: 20, derecha: 80, abajo: 28, izquierda: 36 };
  const w = Math.max(ancho - m.izquierda - m.derecha, 10);
  const h = alto - m.arriba - m.abajo;
  const ejeY = marcas(Math.max(...sprints.map((s) => s.puntos), promedio, 1));
  const maxY = ejeY[ejeY.length - 1];
  const y = (v) => m.arriba + h - (v / maxY) * h;
  const banda = w / sprints.length;
  const barra = Math.min(48, banda * 0.6);

  return (
    <div ref={ref} className="relative">
      {ancho > 0 && (
        <svg width={ancho} height={alto} role="img" aria-label={`Velocidad del equipo, promedio ${promedio} puntos`}>
          {ejeY.map((v) => (
            <g key={v}>
              <line x1={m.izquierda} x2={m.izquierda + w} y1={y(v)} y2={y(v)} stroke={v === 0 ? C.base : C.rejilla} />
              <text x={m.izquierda - 8} y={y(v)} dy="0.32em" textAnchor="end" fontSize="11" fill={C.apagada}>
                {v}
              </text>
            </g>
          ))}
          {sprints.map((s, i) => {
            const cx = m.izquierda + banda * i + banda / 2;
            const alturaBarra = Math.max(y(0) - y(s.puntos), s.puntos ? 4 : 0);
            return (
              <g key={s.id} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={cx - banda / 2} y={m.arriba} width={banda} height={h} fill={hover === i ? '#f2ece2' : 'transparent'} />
                {alturaBarra > 0 && (
                  // Esquinas redondeadas solo arriba: la barra se apoya en la línea base
                  <path
                    d={`M${cx - barra / 2},${y(0)} V${y(0) - alturaBarra + 4} q0,-4 4,-4 H${cx + barra / 2 - 4} q4,0 4,4 V${y(0)} Z`}
                    fill={C.serie}
                  />
                )}
                <text x={cx} y={alto - 8} textAnchor="middle" fontSize="11" fill={C.apagada}>
                  {s.nombre.length > 12 ? `${s.nombre.slice(0, 11)}…` : s.nombre}
                </text>
              </g>
            );
          })}
          <line x1={m.izquierda} x2={m.izquierda + w} y1={y(promedio)} y2={y(promedio)} stroke={C.secundaria} strokeWidth="2" strokeDasharray="5 4" pointerEvents="none" />
          <text x={m.izquierda + w + 6} y={y(promedio)} dy="0.32em" fontSize="11" fill={C.secundaria}>
            Prom. {promedio}
          </text>
        </svg>
      )}
      {hover != null && (
        <Tooltip x={m.izquierda + banda * hover + banda / 2} y={y(sprints[hover].puntos) - 40} ancho={ancho}>
          <p className="mb-1 font-semibold text-slate-900">{sprints[hover].nombre}</p>
          <FilaTooltip color={C.serie} etiqueta="Completados" valor={`${sprints[hover].puntos} pts`} />
          <p className="mt-1 text-slate-500">{sprints[hover].tareas} tareas terminadas</p>
        </Tooltip>
      )}
    </div>
  );
}

export const COLORES_GRAFICO = C;
