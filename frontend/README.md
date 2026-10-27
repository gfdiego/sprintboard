# SprintBoard — Frontend

Interfaz web de SprintBoard. **Tecnologías:** React 19, Vite, React Router y Tailwind CSS.

## Puesta en marcha

Necesitas el backend encendido en `http://localhost:3000` (ver `../backend/README.md`).

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

En desarrollo, Vite reenvía `/api` al backend (`vite.config.js`), así el navegador ve un
solo origen y la cookie del refresh token funciona sin configurar nada.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` | Genera la versión de producción en `dist/` |
| `npm run preview` | Sirve `dist/` para probarla |

## Estructura

```
src/
├── api/
│   ├── cliente.js            # fetch con token, renovación automática y errores
│   ├── auth.js               # login, registro, logout, sesiones
│   └── recursos.js           # proyectos, miembros, sprints, tareas, comentarios, etiquetas, reportes
├── contexto/
│   ├── AuthContext.jsx       # usuario actual y acciones de sesión (useAuth)
│   ├── ProyectoContext.jsx   # proyecto abierto: rol, miembros, sprints, etiquetas (useProyecto)
│   └── Notificaciones.jsx    # mensajes breves en la esquina (useNotificar)
├── hooks/useCarga.js         # pide datos a la API y los recarga cuando cambian las dependencias
├── componentes/
│   ├── ui.jsx                # Campo, Selector, AreaTexto, Boton, Alerta, Vacio, Spinner, Logo
│   ├── insignias.jsx         # tipo, prioridad, avatar, etiqueta, estado, rol, puntos
│   ├── Modal.jsx
│   ├── graficos.jsx          # burndown, carga y velocidad (SVG)
│   ├── tareas/               # tarjeta, fila, nueva tarea, detalle, comentarios, historial
│   ├── Rutas.jsx             # RutaProtegida y RutaInvitado
│   ├── Layout.jsx            # barra superior de la app
│   └── PlantillaAuth.jsx     # diseño de login y registro
├── paginas/
│   ├── Login, Registro, Proyectos, Sesiones, NoEncontrado
│   └── proyecto/             # ProyectoLayout, Tablero, Backlog, Reportes, Ajustes
└── utils/                    # constantes (tipos, estados, roles) y formato de fechas
```

## Cómo se maneja la sesión

| | Dónde vive | Quién lo usa |
|---|---|---|
| Access token (15 min) | `sessionStorage` de la pestaña | `api()` lo manda en `Authorization: Bearer …` |
| Refresh token (1 día) | Cookie `httpOnly` | Solo el navegador; JavaScript no lo puede leer |

1. **Login / registro:** guarda el access token y el backend deja la cookie.
2. **Cada petición** pasa por `api()` en `src/api/cliente.js`. Si responde `401`, llama a
   `/auth/refresh`, guarda el token nuevo y reintenta una vez. Si la renovación falla, la
   sesión se cierra y `RutaProtegida` manda al login.
3. **Al abrir la app** (pestaña nueva o F5) se recupera la sesión con la cookie, sin pedir
   la contraseña.
4. **Varias renovaciones a la vez** comparten una sola petición; si otra pestaña acaba de
   renovar (`409`), se reintenta.
5. **Cerrar sesión** en una pestaña avisa a las demás (`BroadcastChannel`).

Para llamar a la API desde cualquier página:

```js
import { api } from '../api/cliente';

const proyectos = await api('/proyectos');
await api('/proyectos', { metodo: 'POST', cuerpo: { clave: 'WEB', nombre: 'Sitio web' } });
```

Los errores llegan como `ErrorApi` con `estado`, `message` y `erroresPorCampo` (para mostrar
los errores de validación del backend junto a cada campo).

## Producción

- Pon la URL pública del backend en `VITE_API_URL` (ver `.env.example`) antes de `npm run build`.
- En el backend: `CORS_ORIGIN` con el dominio del frontend, HTTPS y, si los dominios son
  distintos, `COOKIE_SAMESITE=none`.
- El hosting debe redirigir todas las rutas a `index.html` (por ejemplo, *rewrites* en Vercel o
  `_redirects` en Netlify) para que funcione recargar en `/sesiones`.

## Pantallas

| Ruta | Qué hace |
|---|---|
| `/` | Mis proyectos y crear proyecto |
| `/proyectos/:id` | **Tablero** del sprint activo: arrastrar tareas entre columnas, filtros por persona, tipo y texto, cerrar sprint |
| `/proyectos/:id/backlog` | Backlog y sprints: arrastrar tareas a un sprint, crear, editar, iniciar y eliminar sprints |
| `/proyectos/:id/reportes` | Burndown, carga del equipo frente a su capacidad y velocidad (cada gráfico tiene vista de tabla) |
| `/proyectos/:id/ajustes` | Datos del proyecto, miembros y roles, etiquetas, eliminar proyecto |
| `?tarea=ID` | Panel de detalle de la tarea en cualquier pestaña: editar campos, subtareas, comentarios e historial. El enlace se puede compartir |
| `/sesiones` | Dispositivos con la sesión abierta |

**Permisos:** la interfaz oculta o desactiva lo que el rol no permite (el backend lo valida igual).
Observador: solo lectura. Miembro: crea, edita y mueve tareas, comenta y crea etiquetas.
Admin: además gestiona sprints, miembros, etiquetas y el proyecto.

## Probar contra otro backend

```bash
VITE_PROXY_API=http://localhost:3100 npx vite --port 5180
```
