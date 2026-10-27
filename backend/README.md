# SprintBoard – Backend

API REST para gestionar proyectos al estilo Jira: proyectos, miembros con roles, sprints, tareas con
asignación y puntos de dificultad, tablero Kanban, comentarios, etiquetas, historial y reportes.

**Tecnologías:** Node.js 18+, Express 5, PostgreSQL (Neon) con `pg`, JWT, bcryptjs y zod.

## Puesta en marcha

1. En [neon.tech](https://neon.tech) crea un proyecto y copia la cadena de conexión
   (**Connect → Pooled connection**).
2. Configura el entorno:
   ```bash
   cp .env.example .env
   # Pega la cadena en DATABASE_URL y genera JWT_ACCESS_SECRET y JWT_REFRESH_SECRET
   # (ejecuta el comando dos veces: deben ser distintos):
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
3. Instala, crea las tablas y arranca:
   ```bash
   npm install
   npm run db:migrar     # crea las tablas en Neon
   npm run db:semilla    # opcional: datos de demo (ana@ejemplo.com / Demo12345)
   npm run dev           # http://localhost:3000
   ```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor con recarga automática |
| `npm start` | Servidor en modo normal |
| `npm run db:migrar` | Aplica las migraciones pendientes de `db/migraciones/` |
| `npm run db:semilla` | Carga datos de demo (bloqueado en producción) |
| `npm test` | Ejecuta las pruebas |

## Pruebas

- Las **unitarias** no necesitan base de datos.
- Las de **integración** necesitan `DATABASE_URL_TEST` en `.env`. Usa una base aparte
  (por ejemplo, una rama `test` en Neon), porque **borran y recrean el esquema**.

## Estructura

```
backend/
├── db/
│   ├── migraciones/001_esquema.sql   # tablas, tipos e índices
│   ├── migraciones/002_refresh_tokens.sql # sesiones (refresh tokens)
│   ├── migrar.js                     # npm run db:migrar
│   └── semilla.js                    # npm run db:semilla
├── src/
│   ├── app.js                        # Express, middlewares y montaje de rutas
│   ├── server.js                     # arranque y apagado ordenado
│   ├── config/env.js                 # variables de entorno
│   ├── lib/bd.js                     # pool de conexiones a Neon
│   ├── lib/transaccion.js            # helper BEGIN/COMMIT/ROLLBACK
│   ├── middleware/
│   │   ├── autenticar.js             # firma y verifica access/refresh JWT
│   │   ├── miembroProyecto.js        # acceso por proyecto y rol
│   │   ├── validar.js                # validación con zod
│   │   ├── limiteIntentos.js         # anti fuerza bruta en el login
│   │   └── errores.js                # 404 y manejo central de errores
│   ├── utils/                        # errores HTTP, historial, esquemas comunes
│   └── modulos/                      # cada módulo: rutas → controlador → servicio
│       ├── auth/  proyectos/  miembros/  sprints/
│       └── tareas/  comentarios/  etiquetas/  reportes/
└── tests/
```

## Roles por proyecto

| Acción | observador | miembro | admin |
|---|:-:|:-:|:-:|
| Ver proyecto, tareas, tablero y reportes | ✔ | ✔ | ✔ |
| Crear, editar, asignar y mover tareas; comentar | | ✔ | ✔ |
| Eliminar una tarea | | solo si la creó | ✔ |
| Gestionar miembros y sprints, editar proyecto | | | ✔ |

Quien no es miembro recibe **404** para no revelar que el proyecto existe.

## Endpoints

Todas las rutas, salvo `/api/salud` y las de `/api/auth` (excepto `/yo`), requieren
`Authorization: Bearer <accessToken>`.

### Autenticación
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/registro` | `{ nombre, correo, password }` → `{ usuario, accessToken }` + cookie `refreshToken` (10 registros / hora por IP) |
| POST | `/api/auth/login` | `{ correo, password }` → `{ usuario, accessToken }` + cookie `refreshToken` (5 intentos fallidos / 15 min) |
| POST | `/api/auth/refresh` | Usa la cookie → `{ usuario, accessToken }` y rota la cookie (20 intentos / 15 min) |
| POST | `/api/auth/logout` | Revoca la sesión de la cookie y la borra → `204` |
| GET | `/api/auth/yo` | Usuario actual (access token) |
| GET | `/api/auth/sesiones` | Dispositivos con sesión abierta: `id`, `iniciada_en`, `ultima_actividad`, `ip`, `agente`, `actual` (access token) |
| DELETE | `/api/auth/sesiones/:id` | Cierra un dispositivo concreto → `204` (access token) |
| POST | `/api/auth/logout-todas` | Cierra la sesión en todos los dispositivos → `204` (access token) |

#### Cómo funcionan los tokens

| | Access token | Refresh token |
|---|---|---|
| Duración | 15 min (`JWT_ACCESS_EXPIRA`) | 1 día (`JWT_REFRESH_EXPIRA`) |
| Viaja en | Header `Authorization: Bearer …` | Cookie `refreshToken` (`HttpOnly`, `SameSite=Strict`, `Path=/api/auth`, `Secure` en producción) |
| Se guarda en | `sessionStorage` del frontend | Solo en el navegador (JavaScript no lo puede leer) y su `jti` en la tabla `refresh_tokens` |
| Secreto | `JWT_ACCESS_SECRET` | `JWT_REFRESH_SECRET` |

- Cada token lleva un campo `tipo` (`access` / `refresh`) y se firma con su propio secreto, así que uno no sirve en lugar del otro.
- **Rotación:** cada `/refresh` revoca el refresh usado y entrega uno nuevo.
- **Detección de robo:** si alguien reutiliza un refresh ya rotado (pasados 10 s), se cierran **todas** las sesiones del usuario.
- **Sesiones por dispositivo:** cada login crea una sesión (`sesion_id`) que se conserva al rotar; se pueden listar y cerrar una a una o todas.
- `/logout` revoca la sesión en la BD; el access token que quede sigue sirviendo como máximo 15 min, por eso el frontend también debe borrarlo.
- **CSRF:** además de `SameSite`, `/refresh` y `/logout` rechazan con `403` peticiones cuyo `Origin` no esté en `CORS_ORIGIN` o que el navegador marque como `cross-site`.
- **Limpieza:** cada hora el servidor borra los refresh tokens vencidos o revocados hace más de un día.
- La sesión se renueva mientras el usuario la use: el refresh dura 1 día **desde el último uso**.

#### Producción
- `NODE_ENV=production` activa la cookie `Secure`: la API debe servirse por **HTTPS**.
- Detrás de un proxy (Render, Railway, Nginx) pon `TRUST_PROXY=1`; si no, todos los usuarios comparten la IP del proxy y el límite de intentos los bloquea juntos.
- Si frontend y API quedan en dominios distintos, usa `COOKIE_SAMESITE=none` y pon el dominio del frontend en `CORS_ORIGIN`.
- Los límites de intentos viven en memoria: con varias instancias del servidor habría que llevarlos a Redis.

#### Uso desde el frontend

```js
const API = 'http://localhost:3000/api';

// credentials: 'include' es obligatorio para que el navegador envíe y guarde la cookie
async function login(correo, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo, password }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  const { usuario, accessToken } = await res.json();
  sessionStorage.setItem('accessToken', accessToken);
  return usuario;
}

let refrescando = null; // evita varios /refresh a la vez
function refrescar() {
  refrescando ??= fetch(`${API}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then(async (res) => {
      if (!res.ok) throw new Error('Sesión expirada');
      const { accessToken } = await res.json();
      sessionStorage.setItem('accessToken', accessToken);
    })
    .finally(() => (refrescando = null));
  return refrescando;
}

// Úsala para todas las peticiones: si el access token venció, lo renueva y reintenta una vez
async function api(ruta, opciones = {}) {
  const pedir = () =>
    fetch(`${API}${ruta}`, {
      ...opciones,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...opciones.headers,
        Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
      },
    });
  let res = await pedir();
  if (res.status === 401) {
    try {
      await refrescar();
    } catch {
      sessionStorage.removeItem('accessToken');
      window.location.href = '/login';
      return res;
    }
    res = await pedir();
  }
  return res;
}

async function logout() {
  await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
  sessionStorage.removeItem('accessToken');
}
```

Al abrir una pestaña nueva el `sessionStorage` está vacío: llama a `refrescar()` al iniciar la app
y, si responde bien, el usuario sigue con su sesión sin volver a escribir la contraseña.

### Proyectos y miembros
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/proyectos` | Mis proyectos, con mi rol |
| POST | `/api/proyectos` | `{ clave, nombre, descripcion? }` (el creador queda como admin) |
| GET | `/api/proyectos/:pid` | Detalle, con el sprint activo |
| PATCH / DELETE | `/api/proyectos/:pid` | Editar o eliminar (admin) |
| GET | `/api/proyectos/:pid/miembros` | Lista de miembros |
| POST | `/api/proyectos/:pid/miembros` | `{ correo, rol?, capacidad_puntos? }` (admin) |
| PATCH | `/api/proyectos/:pid/miembros/:uid` | `{ rol?, capacidad_puntos? }` (admin) |
| DELETE | `/api/proyectos/:pid/miembros/:uid` | Quitar (admin) o salir uno mismo |

### Tareas
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/proyectos/:pid/tareas` | Filtros: `asignado=yo\|ninguno\|id`, `estado`, `sprint=backlog\|id`, `tipo`, `prioridad`, `q` |
| POST | `/api/proyectos/:pid/tareas` | Crear (la clave `WEB-n` se genera sola) |
| GET | `/api/proyectos/:pid/backlog` | Tareas sin sprint, con total de puntos |
| GET | `/api/tareas/:id` | Detalle, con padre, hijas y `puntos_hijas` |
| PATCH | `/api/tareas/:id` | Editar título, descripción, tipo, prioridad, puntos, sprint, padre o fecha |
| PATCH | `/api/tareas/:id/asignar` | `{ asignado_id }`; devuelve `advertencia` si se supera la capacidad |
| PATCH | `/api/tareas/:id/mover` | `{ estado?, orden? }` (arrastre en el Kanban) |
| GET | `/api/tareas/:id/historial` | Cambios registrados |
| DELETE | `/api/tareas/:id` | Creador o admin |

Campos de una tarea: `tipo` (historia, tarea, bug, epica, subtarea), `prioridad` (minima, baja, media,
alta, critica), `estado` (por_hacer, en_progreso, en_revision, hecho) y `puntos` (1, 2, 3, 5, 8, 13, 21).

### Sprints
| Método | Ruta | Descripción |
|---|---|---|
| GET / POST | `/api/proyectos/:pid/sprints` | Listar o crear (admin) |
| GET / PATCH / DELETE | `/api/sprints/:id` | Ver, editar o eliminar (solo si está planificado) |
| POST | `/api/sprints/:id/iniciar` | Solo puede haber un sprint activo por proyecto |
| POST | `/api/sprints/:id/cerrar` | Lo no terminado vuelve al backlog |
| GET | `/api/sprints/:id/tablero` | Tareas agrupadas por estado |

### Comentarios y etiquetas
| Método | Ruta | Descripción |
|---|---|---|
| GET / POST | `/api/tareas/:id/comentarios` | Ver o comentar |
| PATCH / DELETE | `/api/comentarios/:id` | Editar (autor) o eliminar (autor o admin) |
| GET / POST | `/api/proyectos/:pid/etiquetas` | Ver o crear |
| DELETE | `/api/proyectos/:pid/etiquetas/:eid` | Eliminar (admin) |
| PUT | `/api/tareas/:id/etiquetas` | `{ etiquetas: [ids] }` reemplaza las de la tarea |

### Reportes
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/proyectos/:pid/reportes/carga?sprint=` | Puntos asignados frente a la capacidad de cada miembro |
| GET | `/api/proyectos/:pid/reportes/velocidad` | Puntos completados por sprint cerrado |
| GET | `/api/sprints/:id/reportes/burndown` | Puntos restantes por día y línea ideal |

## Pendiente

- Rutas para `adjuntos` (la tabla existe, falta decidir dónde guardar los archivos).
- Recuperación y cambio de contraseña (al hacerlo, llamar a `cerrarTodasLasSesiones`).
- El límite de intentos del login vive en memoria (sirve para un solo servidor).
- Frontend en React.
