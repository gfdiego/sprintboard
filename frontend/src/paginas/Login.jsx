import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../contexto/AuthContext';
import PlantillaAuth from '../componentes/PlantillaAuth';
import { Alerta, Boton, Campo } from '../componentes/ui';

export default function Login() {
  const { iniciarSesion } = useAuth();
  const ubicacion = useLocation();
  const [form, setForm] = useState({ correo: '', password: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      // Al guardar el usuario, RutaInvitado redirige a donde iba
      await iniciarSesion(form.correo.trim(), form.password);
    } catch (err) {
      setError(err.estado === 400 ? 'Escribe un correo y una contraseña válidos.' : err.message);
      setEnviando(false);
    }
  };

  return (
    <PlantillaAuth titulo="Inicia sesión" subtitulo="Bienvenido de nuevo. Ingresa tus datos para continuar.">
      <form onSubmit={enviar} className="space-y-5" noValidate>
        {ubicacion.state?.desde && !error && (
          <Alerta tipo="info">Inicia sesión para continuar.</Alerta>
        )}
        <Alerta>{error}</Alerta>
        <Campo
          etiqueta="Correo"
          tipo="email"
          name="correo"
          autoComplete="email"
          placeholder="tu@correo.com"
          value={form.correo}
          onChange={cambiar}
          required
          autoFocus
        />
        <Campo
          etiqueta="Contraseña"
          tipo="password"
          name="password"
          autoComplete="current-password"
          value={form.password}
          onChange={cambiar}
          required
        />
        <Boton type="submit" cargando={enviando} className="w-full" disabled={!form.correo || !form.password}>
          Entrar
        </Boton>
      </form>
      <p className="text-center text-sm text-slate-500">
        ¿No tienes cuenta?{' '}
        <Link to="/registro" state={ubicacion.state} className="font-medium text-blue-600 hover:underline">
          Regístrate
        </Link>
      </p>
    </PlantillaAuth>
  );
}
