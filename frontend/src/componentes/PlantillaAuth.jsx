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
      <aside className="relative hidden flex-col justify-between bg-blue-700 p-12 text-blue-50 lg:flex">
        {/* marco fino, como papelería */}
        <span className="pointer-events-none absolute inset-6 rounded-2xl border border-blue-50/15" aria-hidden="true" />
        <span className="relative inline-flex items-center gap-2 text-lg font-semibold text-white">
          <img src="/logo.svg" alt="" className="size-8 rounded-lg ring-1 ring-white/25" />
          SprintBoard
        </span>
        <div className="relative space-y-6">
          <h2 className="text-4xl font-medium leading-tight text-white">
            Planifica, prioriza y entrega
            <br />
            con tu equipo.
          </h2>
          <ul className="space-y-3 text-blue-100">
            {PUNTOS.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span className="mt-2.5 h-px w-4 shrink-0 bg-blue-200" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-blue-200">Gestión ágil de proyectos</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <Logo className="lg:hidden" />
            <h1 className="text-3xl font-medium text-slate-900">{titulo}</h1>
            <p className="text-sm text-slate-500">{subtitulo}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
