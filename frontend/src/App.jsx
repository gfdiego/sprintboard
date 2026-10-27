import { Route, Routes } from 'react-router';
import { RutaInvitado, RutaProtegida } from './componentes/Rutas';
import Layout from './componentes/Layout';
import Login from './paginas/Login';
import Registro from './paginas/Registro';
import Proyectos from './paginas/Proyectos';
import Sesiones from './paginas/Sesiones';
import NoEncontrado from './paginas/NoEncontrado';
import ProyectoLayout from './paginas/proyecto/ProyectoLayout';
import Tablero from './paginas/proyecto/Tablero';
import Backlog from './paginas/proyecto/Backlog';
import Reportes from './paginas/proyecto/Reportes';
import Ajustes from './paginas/proyecto/Ajustes';

export default function App() {
  return (
    <Routes>
      <Route element={<RutaInvitado />}>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
      </Route>

      <Route element={<RutaProtegida />}>
        <Route element={<Layout />}>
          <Route index element={<Proyectos />} />
          <Route path="/sesiones" element={<Sesiones />} />
          <Route path="/proyectos/:pid" element={<ProyectoLayout />}>
            <Route index element={<Tablero />} />
            <Route path="backlog" element={<Backlog />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="ajustes" element={<Ajustes />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NoEncontrado />} />
    </Routes>
  );
}
