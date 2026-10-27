import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { proyectos as apiProyectos } from '../api/recursos';
import { useAuth } from '../contexto/AuthContext';
import { useNotificar } from '../contexto/Notificaciones';
import { useCarga } from '../hooks/useCarga';
import Modal from '../componentes/Modal';
import { RolInsignia } from '../componentes/insignias';
import { Alerta, AreaTexto, Boton, Campo, Cargando, Vacio } from '../componentes/ui';

/** "Sitio web nuevo" → "SWN" */
function sugerirClave(nombre) {
  const palabras = nombre
    .normalize('NFD')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .toUpperCase()
    .split(' ')
    .filter(Boolean);
  if (!palabras.length) return '';
  const clave = palabras.length === 1 ? palabras[0].slice(0, 4) : palabras.map((p) => p[0]).join('');
  return clave.replace(/^[0-9]+/, '').slice(0, 10);
}

function NuevoProyecto({ abierto, alCerrar }) {
  const navegar = useNavigate();
  const notificar = useNotificar();
  const [form, setForm] = useState({ nombre: '', clave: '', descripcion: '' });
  const [claveEditada, setClaveEditada] = useState(false);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cambiarNombre = (e) => {
    const nombre = e.target.value;
    setForm((f) => ({ ...f, nombre, clave: claveEditada ? f.clave : sugerirClave(nombre) }));
  };

  const enviar = async (e) => {
    e.preventDefault();
    setErrores({});
    setError('');
    setEnviando(true);
    try {
      const creado = await apiProyectos.crear({
        nombre: form.nombre.trim(),
        clave: form.clave.trim(),
        descripcion: form.descripcion.trim() || undefined,
      });
      notificar(`Proyecto ${creado.clave} creado`);
      navegar(`/proyectos/${creado.id}/backlog`);
    } catch (err) {
      if (err.estado === 400 && err.detalles) setErrores(err.erroresPorCampo);
      else if (err.estado === 409) setErrores({ clave: err.message });
      else setError(err.message);
      setEnviando(false);
    }
  };

  return (
    <Modal abierto={abierto} alCerrar={alCerrar} titulo="Nuevo proyecto">
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <Alerta>{error}</Alerta>
        <Campo etiqueta="Nombre" value={form.nombre} onChange={cambiarNombre} error={errores.nombre} placeholder="Sitio web" required />
        <Campo
          etiqueta="Clave"
          value={form.clave}
          onChange={(e) => {
            setClaveEditada(true);
            setForm({ ...form, clave: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) });
          }}
          error={errores.clave}
          ayuda={
            <>
              De 2 a 10 letras o números. Las tareas se llamarán <strong>{form.clave || 'WEB'}-1</strong>, <strong>{form.clave || 'WEB'}-2</strong>…
            </>
          }
          placeholder="WEB"
        />
        <AreaTexto
          etiqueta="Descripción (opcional)"
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          error={errores.descripcion}
          rows={3}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Boton type="button" variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={enviando} disabled={form.nombre.trim().length < 2 || form.clave.length < 2}>
            Crear proyecto
          </Boton>
        </div>
      </form>
    </Modal>
  );
}

export default function Proyectos() {
  const { usuario } = useAuth();
  const { datos: lista, error, cargando } = useCarga(() => apiProyectos.listar(), []);
  const [creando, setCreando] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Hola, {usuario.nombre.split(' ')[0]}</h1>
          <p className="text-sm text-slate-500">Estos son los proyectos en los que participas.</p>
        </div>
        <Boton onClick={() => setCreando(true)}>+ Nuevo proyecto</Boton>
      </div>

      <Alerta>{error?.message}</Alerta>
      {cargando && !lista && <Cargando />}

      {lista?.length === 0 && (
        <Vacio titulo="Aún no tienes proyectos" accion={<Boton onClick={() => setCreando(true)}>Crear mi primer proyecto</Boton>}>
          Crea un proyecto o pide a un admin que te agregue con tu correo ({usuario.correo}).
        </Vacio>
      )}

      {lista?.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((p) => (
            <li key={p.id}>
              <Link
                to={`/proyectos/${p.id}`}
                className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-md bg-blue-600 px-2 py-1 text-xs font-bold tracking-wide text-white">{p.clave}</span>
                  <RolInsignia rol={p.rol} />
                </div>
                <h2 className="mt-3 font-semibold text-slate-900">{p.nombre}</h2>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-500">{p.descripcion || 'Sin descripción'}</p>
                <div className="mt-4 flex gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span>
                    <strong className="text-slate-800">{p.tareas_abiertas}</strong> tareas abiertas
                  </span>
                  <span>
                    <strong className="text-slate-800">{p.total_miembros}</strong> {p.total_miembros === 1 ? 'miembro' : 'miembros'}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <NuevoProyecto abierto={creando} alCerrar={() => setCreando(false)} />
    </div>
  );
}
