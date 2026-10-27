import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AuthProvider } from './contexto/AuthContext';
import { NotificacionesProvider } from './contexto/Notificaciones';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotificacionesProvider>
          <App />
        </NotificacionesProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
