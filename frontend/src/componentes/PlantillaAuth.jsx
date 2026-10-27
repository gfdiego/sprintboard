import { Logo } from './ui';

const PUNTOS = [
  'Tableros por sprint con columnas al estilo Jira',
  'Historias, bugs, épicas y subtareas con puntos',
  'Reportes de burndown y carga del equipo',
];

/** Pantalla dividida para login y registro. */
export default function PlantillaAuth({ titulo, subtitulo, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-600 p-12 text-white lg:flex">
        <span className="inline-flex items-center gap-2 text-lg font-semibold">
          <img src="/logo.svg" alt="" className="size-8 rounded-lg ring-2 ring-white/30" />
          SprintBoard
        </span>
        <div className="space-y-6">
          <h2 className="text-3xl font-semibold leading-tight">
            Planifica, prioriza y entrega
            <br />
            con tu equipo.
          </h2>
          <ul className="space-y-3 text-blue-50">
            {PUNTOS.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-white/80" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-blue-100">Gestión ágil de proyectos</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <Logo className="lg:hidden" />
            <h1 className="text-2xl font-semibold text-slate-900">{titulo}</h1>
            <p className="text-sm text-slate-500">{subtitulo}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
