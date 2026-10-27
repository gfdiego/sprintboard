import { useState } from 'react';
import { comentarios as apiComentarios } from '../../api/recursos';
import { useAuth } from '../../contexto/AuthContext';
import { useNotificar } from '../../contexto/Notificaciones';
import { useProyecto } from '../../contexto/ProyectoContext';
import { useCarga } from '../../hooks/useCarga';
import { Avatar } from '../insignias';
import { Alerta, Boton, Cargando } from '../ui';
import { fechaHora, tiempoRelativo } from '../../utils/formato';

const AREA =
  'block w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

function Comentario({ comentario, alCambiar }) {
  const { usuario } = useAuth();
  const { esAdmin, puedeEditar } = useProyecto();
  const notificar = useNotificar();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(comentario.contenido);
  const esMio = comentario.autor.id === usuario.id;

  const guardar = async () => {
    try {
      await apiComentarios.editar(comentario.id, texto.trim());
      setEditando(false);
      alCambiar();
    } catch (err) {
      notificar(err.message, 'error');
    }
  };

  const eliminar = async () => {
    if (!window.confirm('¿Eliminar este comentario?')) return;
    try {
      await apiComentarios.eliminar(comentario.id);
      alCambiar();
    } catch (err) {
      notificar(err.message, 'error');
    }
  };

  return (
    <li className="flex gap-3">
      <Avatar usuario={comentario.autor} tamano="size-8" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm">
          <span className="font-medium text-slate-900">{comentario.autor.nombre}</span>{' '}
          <span className="text-xs text-slate-400" title={fechaHora(comentario.creado_en)}>
            {tiempoRelativo(comentario.creado_en)}
            {comentario.actualizado_en && ' · editado'}
          </span>
        </p>
        {editando ? (
          <div className="space-y-2">
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} className={AREA} autoFocus />
            <div className="flex gap-2">
              <Boton onClick={guardar} disabled={!texto.trim()} className="!py-1">
                Guardar
              </Boton>
              <Boton variante="fantasma" className="!py-1" onClick={() => (setEditando(false), setTexto(comentario.contenido))}>
                Cancelar
              </Boton>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{comentario.contenido}</p>
        )}
        {!editando && puedeEditar && (esMio || esAdmin) && (
          <div className="flex gap-3 text-xs text-slate-500">
            {esMio && (
              <button onClick={() => setEditando(true)} className="hover:text-slate-800">
                Editar
              </button>
            )}
            <button onClick={eliminar} className="hover:text-red-600">
              Eliminar
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

export default function Comentarios({ tareaId, alCambiar }) {
  const { usuario } = useAuth();
  const { puedeEditar } = useProyecto();
  const notificar = useNotificar();
  const { datos, error, cargando, recargar } = useCarga(() => apiComentarios.listar(tareaId), [tareaId]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cambio = () => {
    recargar();
    alCambiar();
  };

  const enviar = async (e) => {
    e?.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await apiComentarios.crear(tareaId, texto.trim());
      setTexto('');
      cambio();
    } catch (err) {
      notificar(err.message, 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-5">
      {puedeEditar && (
        <form onSubmit={enviar} className="flex gap-3">
          <Avatar usuario={usuario} tamano="size-8" />
          <div className="flex-1 space-y-2">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter' && enviar()}
              rows={2}
              placeholder="Escribe un comentario… (Ctrl + Enter para enviar)"
              className={AREA}
            />
            {texto.trim() && (
              <Boton type="submit" cargando={enviando} className="!py-1">
                Comentar
              </Boton>
            )}
          </div>
        </form>
      )}
      <Alerta>{error?.message}</Alerta>
      {cargando && !datos && <Cargando />}
      {datos?.length === 0 && <p className="text-sm text-slate-500">Todavía no hay comentarios.</p>}
      {datos?.length > 0 && (
        <ul className="space-y-5">
          {datos.map((c) => (
            <Comentario key={`${c.id}-${c.actualizado_en}`} comentario={c} alCambiar={cambio} />
          ))}
        </ul>
      )}
    </div>
  );
}
