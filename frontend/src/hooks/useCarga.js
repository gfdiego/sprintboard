import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Carga datos de la API y los vuelve a pedir cuando cambian las dependencias.
 *   const { datos, error, cargando, recargar } = useCarga(() => api('/proyectos'), []);
 * Si las dependencias cambian antes de que llegue la respuesta, la respuesta vieja se ignora.
 */
export function useCarga(funcion, dependencias) {
  const [estado, setEstado] = useState({ datos: null, error: null, cargando: true });
  const ultima = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cargar = useCallback(funcion, dependencias);

  const recargar = useCallback(async () => {
    const numero = ++ultima.current;
    setEstado((e) => ({ ...e, cargando: true }));
    try {
      const datos = await cargar();
      if (numero === ultima.current) setEstado({ datos, error: null, cargando: false });
    } catch (error) {
      if (numero === ultima.current) setEstado((e) => ({ ...e, error, cargando: false }));
    }
  }, [cargar]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const setDatos = useCallback((actualizar) => {
    setEstado((e) => ({ ...e, datos: typeof actualizar === 'function' ? actualizar(e.datos) : actualizar }));
  }, []);

  return { ...estado, recargar, setDatos };
}
