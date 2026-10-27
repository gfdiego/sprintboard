import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../contexto/AuthContext';
import PlantillaAuth from '../componentes/PlantillaAuth';
import { Alerta, Boton, Campo } from '../componentes/ui';

// Las mismas reglas que valida el backend (auth.esquemas.js)
const REGLAS = [
  { texto: 'Al menos 8 caracteres', cumple: (p) => p.length >= 8 },
  { texto: 'Una letra', cumple: (p) => /[A-Za-z]/.test(p) },
  { texto: 'Un número', cumple: (p) => /\d/.test(p) },
];

function validar({ nombre, correo, password, confirmar }) {
  const errores = {};
  if (nombre.trim().length < 2) errores.nombre = 'El nombre debe tener al menos 2 caracteres';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) errores.correo = 'Correo inválido';
  if (!REGLAS.every((r) => r.cumple(password))) errores.password = 'La contraseña no cumple los requisitos';
  else if (password.length > 72) errores.password = 'La contraseña no puede superar 72 caracteres';
  if (confirmar !== password) errores.confirmar = 'Las contraseñas no coinciden';
  return errores;
}

function Requisitos({ password }) {
  return (
    <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
      {REGLAS.map((r) => {
        const ok = r.cumple(password);
        return (
          <li key={r.texto} className={ok ? 'text-green-600' : 'text-slate-500'}>
            {ok ? '✓' : '•'} {r.texto}
          </li>
        );
      })}
    </ul>
  );
}

export default function Registro() {
  const { registrarse } = useAuth();
  const ubicacion = useLocation();
  const [form, setForm] = useState({ nombre: '', correo: '', password: '', confirmar: '' });
  const [errores, setErrores] = useState({});
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cambiar = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errores[e.target.name]) setErrores({ ...errores, [e.target.name]: undefined });
  };

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    const encontrados = validar(form);
    setErrores(encontrados);
    if (Object.keys(encontrados).length) return;

    setEnviando(true);
    try {
      await registrarse(form.nombre.trim(), form.correo.trim(), form.password);
    } catch (err) {
      if (err.estado === 400 && err.detalles) setErrores(err.erroresPorCampo);
      else if (err.estado === 409) setErrores({ correo: err.message });
      else setError(err.message);
      setEnviando(false);
    }
  };

  return (
    <PlantillaAuth titulo="Crea tu cuenta" subtitulo="Empieza a organizar tus proyectos en minutos.">
      <form onSubmit={enviar} className="space-y-5" noValidate>
        <Alerta>{error}</Alerta>
        <Campo
          etiqueta="Nombre"
          name="nombre"
          autoComplete="name"
          placeholder="Ana Pérez"
          value={form.nombre}
          onChange={cambiar}
          error={errores.nombre}
          autoFocus
        />
        <Campo
          etiqueta="Correo"
          tipo="email"
          name="correo"
          autoComplete="email"
          placeholder="tu@correo.com"
          value={form.correo}
          onChange={cambiar}
          error={errores.correo}
        />
        <Campo
          etiqueta="Contraseña"
          tipo="password"
          name="password"
          autoComplete="new-password"
          value={form.password}
          onChange={cambiar}
          error={errores.password}
          ayuda={<Requisitos password={form.password} />}
        />
        <Campo
          etiqueta="Confirmar contraseña"
          tipo="password"
          name="confirmar"
          autoComplete="new-password"
          value={form.confirmar}
          onChange={cambiar}
          error={errores.confirmar}
        />
        <Boton type="submit" cargando={enviando} className="w-full">
          Crear cuenta
        </Boton>
      </form>
      <p className="text-center text-sm text-slate-500">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" state={ubicacion.state} className="font-medium text-blue-600 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </PlantillaAuth>
  );
}
