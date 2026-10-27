import { Link } from 'react-router';

export default function NoEncontrado() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-6xl font-bold text-blue-600">404</p>
      <h1 className="text-xl font-semibold text-slate-900">Página no encontrada</h1>
      <p className="text-sm text-slate-500">La dirección que buscas no existe.</p>
      <Link to="/" className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
        Volver al inicio
      </Link>
    </div>
  );
}
