# SprintBoard API: guía de rutas y datos de prueba

Este documento lista cada ruta del backend con lo que hace, quién puede usarla, un ejemplo del body y la respuesta real que devuelve.
Las respuestas de ejemplo se obtuvieron ejecutando las peticiones contra el servidor (las listas largas se recortaron).

## Contenido

1. [Cómo importar la colección](#cómo-importar-la-colección)
2. [Datos de prueba](#datos-de-prueba)
3. [Valores permitidos](#valores-permitidos)
4. [Códigos de respuesta](#códigos-de-respuesta)
5. [Resumen de rutas](#resumen-de-rutas)
6. [Detalle de cada ruta](#detalle-de-cada-ruta)

## Cómo importar la colección

Los archivos están en `backend/coleccion/`:

| Archivo | Para qué |
|---|---|
| `sprintboard.http` | **Recomendado (gratis):** colección para la extensión REST Client de VS Code |
| `thunder-coleccion.json` | Colección para Thunder Client (VS Code) |
| `thunder-entorno.json` | Variables: `url`, tokens e ids |
| `postman-coleccion.json` | La misma colección para Postman, Insomnia o Bruno |

### REST Client (gratis, recomendado)

1. En VS Code instala la extensión **REST Client** (autor: Huachao Mao).
2. Arranca el backend: `cd backend` y `npm run dev`.
3. Abre `coleccion/sprintboard.http`.
4. Pulsa **Send Request** encima de cada petición, en orden. La respuesta se abre a la derecha.

No hay nada que importar: los tokens y los ids se leen solos de las respuestas anteriores. Si una variable sale vacía, ejecuta antes la petición que la crea (por ejemplo, *Login Ana* para el token).

### Thunder Client

Algunas funciones, como importar colecciones, pueden requerir un plan de pago según la versión. Si no te deja importar, usa REST Client.

1. Arranca el backend: `cd backend` y `npm run dev`.
2. En Thunder Client abre **Collections** → menú `≡` → **Import** → elige `thunder-coleccion.json`.
3. Abre **Env** → menú `≡` → **Import** → elige `thunder-entorno.json`.
4. En la pestaña **Env**, marca **SprintBoard Local** como activo (clic derecho → *Set Active*, o la estrella).
5. Ejecuta las peticiones **en orden**, carpeta por carpeta. También puedes usar **Run All** sobre la colección.

Las peticiones de registro y login guardan solas los tokens (`{{token}}`, `{{token_luis}}`, `{{token_sofia}}`). Las de creación guardan los ids (`{{pid}}`, `{{sid}}`, `{{tid}}`…), así que no tienes que copiar nada a mano.

La colección usa `Bearer {{token}}` (Ana) por defecto. Las peticiones marcadas *como Luis* o *como Sofía* usan el token de esa persona.

### Postman

File → Import → `postman-coleccion.json`. Las variables quedan guardadas en la propia colección.

> **Volver a empezar:** si ya registraste a los usuarios, el registro responde 409. No pasa nada: ejecuta los **Login**, que también guardan los tokens y los ids. Si ya existe el proyecto `WEB`, ejecuta *Eliminar proyecto* o cambia la clave en *Crear proyecto*.

## Datos de prueba

### Usuarios

| Nombre | Correo | Contraseña | Rol en el proyecto WEB | Variable del token |
|---|---|---|---|---|
| Ana Pérez | ana@prueba.com | Clave1234 | admin (creadora) | `{{token}}` |
| Luis Gómez | luis@prueba.com | Clave1234 | miembro (capacidad 10 pts) | `{{token_luis}}` |
| Sofía Ramírez | sofia@prueba.com | Clave1234 | observadora | `{{token_sofia}}` |

### Lo que crea la colección

| Variable | Qué es | Ejemplo |
|---|---|---|
| `pid` | Proyecto WEB "Sitio web corporativo" | 1 |
| `sid` | Sprint 1 "Página de inicio y login" | 1 |
| `epica_id` | WEB-1 Épica "Autenticación de usuarios" | 1 |
| `tid` | WEB-2 Historia "Pantalla de inicio de sesión" (5 → 8 pts, Luis) | 2 |
| `tid2` | WEB-3 Bug "El menú no se ve en celulares" (3 pts) | 3 |
| `sub_id` | WEB-4 Subtarea "Validar formato del correo" (1 pt) | 4 |
| `tid3` | WEB-5 Tarea de backlog "Optimizar imágenes del sitio" (2 pts) | 5 |
| `eid`, `eid2` | Etiquetas `frontend` (#3b82f6) y `urgente` (#ef4444) | 1, 2 |
| `cid` | Comentario de Luis en WEB-2 | 1 |

Los ids reales dependen de lo que ya exista en tu base. Las peticiones los guardan solas.

## Valores permitidos

| Campo | Valores |
|---|---|
| `tipo` (tarea) | `historia`, `tarea`, `bug`, `epica`, `subtarea` |
| `prioridad` | `minima`, `baja`, `media`, `alta`, `critica` |
| `estado` (tarea) | `por_hacer`, `en_progreso`, `en_revision`, `hecho` |
| `puntos` (dificultad) | `1`, `2`, `3`, `5`, `8`, `13`, `21` o `null` |
| `rol` (miembro) | `admin`, `miembro`, `observador` |
| `estado` (sprint) | `planificado` → `activo` → `cerrado` |
| Fechas | Texto `AAAA-MM-DD`, por ejemplo `2026-12-15` |
| `clave` (proyecto) | 2 a 10 caracteres, empieza con letra, solo letras y números (se guarda en mayúsculas) |
| `password` | 8 a 72 caracteres, al menos una letra y un número |
| `color` (etiqueta) | `#RRGGBB`, por ejemplo `#3b82f6` |

**Reglas de las tareas:**

- Una `subtarea` siempre necesita `padre_id`, y una subtarea no puede tener hijas.
- Una `epica` no puede tener padre.
- Solo se puede asignar a miembros del proyecto. Si se supera la capacidad, la respuesta trae `advertencia`, pero la asignación se guarda.
- No se pueden agregar tareas a un sprint cerrado.
- Sin `sprint_id`, la tarea queda en el backlog.

## Códigos de respuesta

| Código | Significado |
|---|---|
| 200 | Correcto |
| 201 | Creado |
| 204 | Correcto, sin contenido (al eliminar) |
| 400 | Datos inválidos; `detalles` indica el campo |
| 401 | Sin token, token vencido o login incorrecto |
| 403 | Tu rol no permite la acción |
| 404 | No existe, o no eres miembro del proyecto |
| 409 | Ya existe (correo o clave repetidos) |
| 429 | Demasiados intentos de login (5 cada 15 min) |

Formato de un error:

```json
{
  "error": "Datos inválidos",
  "detalles": [
    {
      "campo": "puntos",
      "mensaje": "Los puntos deben ser uno de: 1, 2, 3, 5, 8, 13, 21"
    }
  ]
}
```

## Resumen de rutas

Base: `http://localhost:3000/api`

| # | Nombre | Método | Ruta | Permiso |
|---|---|---|---|---|
| 1 | [Estado del servidor](#1-estado-del-servidor) | `GET` | `/salud` | Pública |
| 2 | [Información de la API](#2-información-de-la-api) | `GET` | `/` | Pública |
| 3 | [Registrar a Ana (admin)](#3-registrar-a-ana-admin) | `POST` | `/auth/registro` | Pública |
| 4 | [Registrar a Luis (miembro)](#4-registrar-a-luis-miembro) | `POST` | `/auth/registro` | Pública |
| 5 | [Registrar a Sofía (observadora)](#5-registrar-a-sofía-observadora) | `POST` | `/auth/registro` | Pública |
| 6 | [Login Ana](#6-login-ana) | `POST` | `/auth/login` | Pública |
| 7 | [Login Luis](#7-login-luis) | `POST` | `/auth/login` | Pública |
| 8 | [Login Sofía](#8-login-sofía) | `POST` | `/auth/login` | Pública |
| 9 | [Mi usuario (yo)](#9-mi-usuario-yo) | `GET` | `/auth/yo` | Cualquier usuario con token |
| 10 | [Crear proyecto](#10-crear-proyecto) | `POST` | `/proyectos` | Cualquier usuario con token |
| 11 | [Listar mis proyectos](#11-listar-mis-proyectos) | `GET` | `/proyectos` | Cualquier usuario con token |
| 12 | [Ver proyecto](#12-ver-proyecto) | `GET` | `/proyectos/{{pid}}` | observador, miembro, admin |
| 13 | [Editar proyecto](#13-editar-proyecto) | `PATCH` | `/proyectos/{{pid}}` | admin |
| 14 | [Agregar a Luis como miembro](#14-agregar-a-luis-como-miembro) | `POST` | `/proyectos/{{pid}}/miembros` | admin |
| 15 | [Agregar a Sofía como observadora](#15-agregar-a-sofía-como-observadora) | `POST` | `/proyectos/{{pid}}/miembros` | admin |
| 16 | [Listar miembros](#16-listar-miembros) | `GET` | `/proyectos/{{pid}}/miembros` | observador, miembro, admin |
| 17 | [Cambiar capacidad de Luis](#17-cambiar-capacidad-de-luis) | `PATCH` | `/proyectos/{{pid}}/miembros/{{luis_id}}` | admin |
| 18 | [Crear etiqueta](#18-crear-etiqueta) | `POST` | `/proyectos/{{pid}}/etiquetas` | miembro, admin |
| 19 | [Crear otra etiqueta](#19-crear-otra-etiqueta) | `POST` | `/proyectos/{{pid}}/etiquetas` | miembro, admin |
| 20 | [Listar etiquetas](#20-listar-etiquetas) | `GET` | `/proyectos/{{pid}}/etiquetas` | observador, miembro, admin |
| 21 | [Crear sprint](#21-crear-sprint) | `POST` | `/proyectos/{{pid}}/sprints` | admin |
| 22 | [Listar sprints](#22-listar-sprints) | `GET` | `/proyectos/{{pid}}/sprints` | observador, miembro, admin |
| 23 | [Ver sprint](#23-ver-sprint) | `GET` | `/sprints/{{sid}}` | observador, miembro, admin |
| 24 | [Editar sprint](#24-editar-sprint) | `PATCH` | `/sprints/{{sid}}` | admin |
| 25 | [Crear épica](#25-crear-épica) | `POST` | `/proyectos/{{pid}}/tareas` | miembro, admin |
| 26 | [Crear historia (con puntos, asignada y en el sprint)](#26-crear-historia-con-puntos-asignada-y-en-el-sprint) | `POST` | `/proyectos/{{pid}}/tareas` | miembro, admin |
| 27 | [Crear bug](#27-crear-bug) | `POST` | `/proyectos/{{pid}}/tareas` | miembro, admin |
| 28 | [Crear subtarea](#28-crear-subtarea) | `POST` | `/proyectos/{{pid}}/tareas` | miembro, admin |
| 29 | [Crear tarea para el backlog](#29-crear-tarea-para-el-backlog) | `POST` | `/proyectos/{{pid}}/tareas` | miembro, admin |
| 30 | [Listar todas las tareas](#30-listar-todas-las-tareas) | `GET` | `/proyectos/{{pid}}/tareas` | observador, miembro, admin |
| 31 | [Filtrar: mis tareas (como Luis)](#31-filtrar-mis-tareas-como-luis) | `GET` | `/proyectos/{{pid}}/tareas?asignado=yo` | observador, miembro, admin |
| 32 | [Filtrar: sin asignar](#32-filtrar-sin-asignar) | `GET` | `/proyectos/{{pid}}/tareas?asignado=ninguno` | observador, miembro, admin |
| 33 | [Filtrar: bugs](#33-filtrar-bugs) | `GET` | `/proyectos/{{pid}}/tareas?tipo=bug` | observador, miembro, admin |
| 34 | [Buscar por texto o clave](#34-buscar-por-texto-o-clave) | `GET` | `/proyectos/{{pid}}/tareas?q=login` | observador, miembro, admin |
| 35 | [Ver backlog](#35-ver-backlog) | `GET` | `/proyectos/{{pid}}/backlog` | observador, miembro, admin |
| 36 | [Ver tarea](#36-ver-tarea) | `GET` | `/tareas/{{tid}}` | observador, miembro, admin |
| 37 | [Editar tarea (cambiar puntos y prioridad)](#37-editar-tarea-cambiar-puntos-y-prioridad) | `PATCH` | `/tareas/{{tid}}` | miembro, admin |
| 38 | [Asignar bug a Luis](#38-asignar-bug-a-luis) | `PATCH` | `/tareas/{{tid2}}/asignar` | miembro, admin |
| 39 | [Reasignar bug a Ana](#39-reasignar-bug-a-ana) | `PATCH` | `/tareas/{{tid2}}/asignar` | miembro, admin |
| 40 | [Mover tarea a "en progreso"](#40-mover-tarea-a-en-progreso) | `PATCH` | `/tareas/{{tid}}/mover` | miembro, admin |
| 41 | [Mover bug a "hecho"](#41-mover-bug-a-hecho) | `PATCH` | `/tareas/{{tid2}}/mover` | miembro, admin |
| 42 | [Poner etiquetas a una tarea](#42-poner-etiquetas-a-una-tarea) | `PUT` | `/tareas/{{tid2}}/etiquetas` | miembro, admin |
| 43 | [Historial de la tarea](#43-historial-de-la-tarea) | `GET` | `/tareas/{{tid}}/historial` | observador, miembro, admin |
| 44 | [Comentar tarea (como Luis)](#44-comentar-tarea-como-luis) | `POST` | `/tareas/{{tid}}/comentarios` | miembro, admin |
| 45 | [Listar comentarios](#45-listar-comentarios) | `GET` | `/tareas/{{tid}}/comentarios` | observador, miembro, admin |
| 46 | [Editar comentario (como Luis)](#46-editar-comentario-como-luis) | `PATCH` | `/comentarios/{{cid}}` | Solo el autor |
| 47 | [Iniciar sprint](#47-iniciar-sprint) | `POST` | `/sprints/{{sid}}/iniciar` | admin |
| 48 | [Tablero Kanban](#48-tablero-kanban) | `GET` | `/sprints/{{sid}}/tablero` | observador, miembro, admin |
| 49 | [Carga por miembro](#49-carga-por-miembro) | `GET` | `/proyectos/{{pid}}/reportes/carga` | observador, miembro, admin |
| 50 | [Burndown del sprint](#50-burndown-del-sprint) | `GET` | `/sprints/{{sid}}/reportes/burndown` | observador, miembro, admin |
| 51 | [Cerrar sprint](#51-cerrar-sprint) | `POST` | `/sprints/{{sid}}/cerrar` | admin |
| 52 | [Velocidad del equipo](#52-velocidad-del-equipo) | `GET` | `/proyectos/{{pid}}/reportes/velocidad` | observador, miembro, admin |
| 53 | [ERROR 400 - Puntos inválidos](#53-error-400---puntos-inválidos) | `POST` | `/proyectos/{{pid}}/tareas` | miembro, admin |
| 54 | [ERROR 400 - Subtarea sin padre](#54-error-400---subtarea-sin-padre) | `POST` | `/proyectos/{{pid}}/tareas` | miembro, admin |
| 55 | [ERROR 400 - Contraseña débil](#55-error-400---contraseña-débil) | `POST` | `/auth/registro` | Pública |
| 56 | [ERROR 401 - Sin token](#56-error-401---sin-token) | `GET` | `/proyectos` | — |
| 57 | [ERROR 401 - Contraseña incorrecta](#57-error-401---contraseña-incorrecta) | `POST` | `/auth/login` | Pública |
| 58 | [ERROR 403 - Observadora intenta crear tarea](#58-error-403---observadora-intenta-crear-tarea) | `POST` | `/proyectos/{{pid}}/tareas` | miembro, admin |
| 59 | [ERROR 403 - Miembro intenta agregar miembros](#59-error-403---miembro-intenta-agregar-miembros) | `POST` | `/proyectos/{{pid}}/miembros` | admin |
| 60 | [ERROR 409 - Clave de proyecto repetida](#60-error-409---clave-de-proyecto-repetida) | `POST` | `/proyectos` | Cualquier usuario con token |
| 61 | [ERROR 400 - Asignar a alguien que no es miembro](#61-error-400---asignar-a-alguien-que-no-es-miembro) | `PATCH` | `/tareas/{{tid3}}/asignar` | miembro, admin |
| 62 | [Eliminar comentario](#62-eliminar-comentario) | `DELETE` | `/comentarios/{{cid}}` | Autor o admin |
| 63 | [Eliminar etiqueta](#63-eliminar-etiqueta) | `DELETE` | `/proyectos/{{pid}}/etiquetas/{{eid2}}` | admin |
| 64 | [Eliminar tarea](#64-eliminar-tarea) | `DELETE` | `/tareas/{{tid3}}` | Creador de la tarea o admin |
| 65 | [Crear sprint para eliminar](#65-crear-sprint-para-eliminar) | `POST` | `/proyectos/{{pid}}/sprints` | admin |
| 66 | [Eliminar sprint](#66-eliminar-sprint) | `DELETE` | `/sprints/{{sid2}}` | admin |
| 67 | [Quitar a Sofía del proyecto](#67-quitar-a-sofía-del-proyecto) | `DELETE` | `/proyectos/{{pid}}/miembros/{{sofia_id}}` | admin (o uno mismo para salir) |
| 68 | [Eliminar proyecto](#68-eliminar-proyecto) | `DELETE` | `/proyectos/{{pid}}` | admin |

## Detalle de cada ruta

### 0. Inicio

Comprobar que el servidor está encendido. No requieren token.

#### 1. Estado del servidor

```http
GET {{url}}/salud
```

Responde `{ "estado": "ok" }` si la API está encendida.

- **Permiso:** Pública
- **Token:** Sin token
- **Respuesta esperada:** `200`

**Respuesta (200):**

```json
{
  "estado": "ok"
}
```

#### 2. Información de la API

```http
GET {{url}}
```

Muestra el nombre de la API y cuáles rutas son públicas.

- **Permiso:** Pública
- **Token:** Sin token
- **Respuesta esperada:** `200`

**Respuesta (200):**

```json
{
  "nombre": "SprintBoard API",
  "estado": "ok",
  "publicas": [
    "GET /api/salud",
    "… 2 más"
  ],
  "nota": "Las demás rutas requieren el header Authorization: Bearer <token> (obtenlo con /api/auth/login)"
}
```

### 1. Autenticación

Registro e inicio de sesión. Guardan automáticamente el token y el id de cada usuario.

#### 3. Registrar a Ana (admin)

```http
POST {{url}}/auth/registro
```

Crea la cuenta de Ana. Si ya existe responde 409: usa "Login Ana".

- **Permiso:** Pública
- **Token:** Sin token
- **Guarda:** `{{token}}`, `{{ana_id}}`
- **Respuesta esperada:** `201`

**Body:**

```json
{
  "nombre": "Ana Pérez",
  "correo": "ana@prueba.com",
  "password": "Clave1234"
}
```

**Respuesta (201):**

```json
{
  "usuario": {
    "id": 1,
    "nombre": "Ana Pérez",
    "correo": "ana@prueba.com",
    "avatar_url": null,
    "creado_en": "2026-10-17T06:01:40.896Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs…"
}
```

#### 4. Registrar a Luis (miembro)

```http
POST {{url}}/auth/registro
```

Crea la cuenta de Luis.

- **Permiso:** Pública
- **Token:** Sin token
- **Guarda:** `{{token_luis}}`, `{{luis_id}}`
- **Respuesta esperada:** `201`

**Body:**

```json
{
  "nombre": "Luis Gómez",
  "correo": "luis@prueba.com",
  "password": "Clave1234"
}
```

**Respuesta (201):**

```json
{
  "usuario": {
    "id": 2,
    "nombre": "Luis Gómez",
    "correo": "luis@prueba.com",
    "avatar_url": null,
    "creado_en": "2026-10-17T06:01:40.920Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs…"
}
```

#### 5. Registrar a Sofía (observadora)

```http
POST {{url}}/auth/registro
```

Crea la cuenta de Sofía.

- **Permiso:** Pública
- **Token:** Sin token
- **Guarda:** `{{token_sofia}}`, `{{sofia_id}}`
- **Respuesta esperada:** `201`

**Body:**

```json
{
  "nombre": "Sofía Ramírez",
  "correo": "sofia@prueba.com",
  "password": "Clave1234"
}
```

**Respuesta (201):**

```json
{
  "usuario": {
    "id": 3,
    "nombre": "Sofía Ramírez",
    "correo": "sofia@prueba.com",
    "avatar_url": null,
    "creado_en": "2026-10-17T06:01:40.931Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs…"
}
```

#### 6. Login Ana

```http
POST {{url}}/auth/login
```

Inicia sesión y guarda `{{token}}`, que usan por defecto todas las peticiones.

- **Permiso:** Pública
- **Token:** Sin token
- **Guarda:** `{{token}}`, `{{ana_id}}`
- **Respuesta esperada:** `200`

**Body:**

```json
{
  "correo": "ana@prueba.com",
  "password": "Clave1234"
}
```

**Respuesta (200):**

```json
{
  "usuario": {
    "id": 1,
    "nombre": "Ana Pérez",
    "correo": "ana@prueba.com",
    "avatar_url": null,
    "creado_en": "2026-10-17T06:01:40.896Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs…"
}
```

#### 7. Login Luis

```http
POST {{url}}/auth/login
```

Guarda `{{token_luis}}`.

- **Permiso:** Pública
- **Token:** Sin token
- **Guarda:** `{{token_luis}}`, `{{luis_id}}`
- **Respuesta esperada:** `200`

**Body:**

```json
{
  "correo": "luis@prueba.com",
  "password": "Clave1234"
}
```

**Respuesta (200):**

```json
{
  "usuario": {
    "id": 2,
    "nombre": "Luis Gómez",
    "correo": "luis@prueba.com",
    "avatar_url": null,
    "creado_en": "2026-10-17T06:01:40.920Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs…"
}
```

#### 8. Login Sofía

```http
POST {{url}}/auth/login
```

Guarda `{{token_sofia}}`.

- **Permiso:** Pública
- **Token:** Sin token
- **Guarda:** `{{token_sofia}}`, `{{sofia_id}}`
- **Respuesta esperada:** `200`

**Body:**

```json
{
  "correo": "sofia@prueba.com",
  "password": "Clave1234"
}
```

**Respuesta (200):**

```json
{
  "usuario": {
    "id": 3,
    "nombre": "Sofía Ramírez",
    "correo": "sofia@prueba.com",
    "avatar_url": null,
    "creado_en": "2026-10-17T06:01:40.931Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs…"
}
```

#### 9. Mi usuario (yo)

```http
GET {{url}}/auth/yo
```

Devuelve los datos del dueño del token.

- **Permiso:** Cualquier usuario con token
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Respuesta (200):**

```json
{
  "id": 1,
  "nombre": "Ana Pérez",
  "correo": "ana@prueba.com",
  "avatar_url": null,
  "creado_en": "2026-10-17T06:01:40.896Z"
}
```

### 2. Proyectos

Quien crea el proyecto queda como admin.

#### 10. Crear proyecto

```http
POST {{url}}/proyectos
```

Crea el proyecto y guarda su id en `{{pid}}`. La clave (2-10 letras/números) se usa en las tareas: WEB-1, WEB-2…

- **Permiso:** Cualquier usuario con token
- **Token:** `Bearer {{token}}` (Ana)
- **Guarda:** `{{pid}}`
- **Respuesta esperada:** `201`

**Body:**

```json
{
  "clave": "WEB",
  "nombre": "Sitio web corporativo",
  "descripcion": "Rediseño del sitio web de la empresa"
}
```

**Respuesta (201):**

```json
{
  "id": 1,
  "clave": "WEB",
  "nombre": "Sitio web corporativo",
  "descripcion": "Rediseño del sitio web de la empresa",
  "propietario_id": 1,
  "contador_tareas": 0,
  "creado_en": "2026-10-17T06:01:41.008Z",
  "rol": "admin"
}
```

#### 11. Listar mis proyectos

```http
GET {{url}}/proyectos
```

Proyectos donde soy miembro, con mi rol y cuántas tareas siguen abiertas.

- **Permiso:** Cualquier usuario con token
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Respuesta (200):**

```json
[
  {
    "id": 1,
    "clave": "WEB",
    "nombre": "Sitio web corporativo",
    "descripcion": "Rediseño del sitio web de la empresa",
    "propietario_id": 1,
    "creado_en": "2026-10-17T06:01:41.008Z",
    "rol": "admin",
    "total_miembros": 1,
    "tareas_abiertas": 0
  }
]
```

#### 12. Ver proyecto

```http
GET {{url}}/proyectos/{{pid}}
```

Detalle del proyecto, con el sprint activo si existe.

- **Permiso:** observador, miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Respuesta (200):**

```json
{
  "id": 1,
  "clave": "WEB",
  "nombre": "Sitio web corporativo",
  "descripcion": "Rediseño del sitio web de la empresa",
  "propietario_id": 1,
  "contador_tareas": 0,
  "creado_en": "2026-10-17T06:01:41.008Z",
  "sprint_activo": null,
  "rol": "admin"
}
```

#### 13. Editar proyecto

```http
PATCH {{url}}/proyectos/{{pid}}
```

Cambia el nombre o la descripción. La clave no se puede cambiar.

- **Permiso:** admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Body:**

```json
{
  "descripcion": "Rediseño completo del sitio y del blog"
}
```

**Respuesta (200):**

```json
{
  "id": 1,
  "clave": "WEB",
  "nombre": "Sitio web corporativo",
  "descripcion": "Rediseño completo del sitio y del blog",
  "propietario_id": 1,
  "contador_tareas": 0,
  "creado_en": "2026-10-17T06:01:41.008Z"
}
```

### 3. Miembros

Agregar personas al proyecto (deben estar registradas) y darles un rol.

#### 14. Agregar a Luis como miembro

```http
POST {{url}}/proyectos/{{pid}}/miembros
```

Se agrega por correo. `capacidad_puntos` = cuántos puntos puede asumir por sprint.

- **Permiso:** admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `201`

**Body:**

```json
{
  "correo": "luis@prueba.com",
  "rol": "miembro",
  "capacidad_puntos": 8
}
```

**Respuesta (201):**

```json
{
  "id": 2,
  "nombre": "Luis Gómez",
  "correo": "luis@prueba.com",
  "avatar_url": null,
  "rol": "miembro",
  "capacidad_puntos": 8,
  "unido_en": "2026-10-17T06:01:41.090Z"
}
```

#### 15. Agregar a Sofía como observadora

```http
POST {{url}}/proyectos/{{pid}}/miembros
```

Un observador solo puede ver.

- **Permiso:** admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `201`

**Body:**

```json
{
  "correo": "sofia@prueba.com",
  "rol": "observador"
}
```

**Respuesta (201):**

```json
{
  "id": 3,
  "nombre": "Sofía Ramírez",
  "correo": "sofia@prueba.com",
  "avatar_url": null,
  "rol": "observador",
  "capacidad_puntos": 10,
  "unido_en": "2026-10-17T06:01:41.103Z"
}
```

#### 16. Listar miembros

```http
GET {{url}}/proyectos/{{pid}}/miembros
```

Miembros con su rol y capacidad.

- **Permiso:** observador, miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Respuesta (200):**

```json
[
  {
    "id": 1,
    "nombre": "Ana Pérez",
    "correo": "ana@prueba.com",
    "avatar_url": null,
    "rol": "admin",
    "capacidad_puntos": 10,
    "unido_en": "2026-10-17T06:01:41.008Z"
  },
  {
    "id": 2,
    "nombre": "Luis Gómez",
    "correo": "luis@prueba.com",
    "avatar_url": null,
    "rol": "miembro",
    "capacidad_puntos": 8,
    "unido_en": "2026-10-17T06:01:41.090Z"
  },
  "… 1 más"
]
```

#### 17. Cambiar capacidad de Luis

```http
PATCH {{url}}/proyectos/{{pid}}/miembros/{{luis_id}}
```

Cambia el rol y/o la capacidad de puntos.

- **Permiso:** admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Body:**

```json
{
  "capacidad_puntos": 10
}
```

**Respuesta (200):**

```json
{
  "id": 2,
  "nombre": "Luis Gómez",
  "correo": "luis@prueba.com",
  "avatar_url": null,
  "rol": "miembro",
  "capacidad_puntos": 10,
  "unido_en": "2026-10-17T06:01:41.090Z"
}
```

### 4. Etiquetas

Etiquetas de color para clasificar tareas.

#### 18. Crear etiqueta

```http
POST {{url}}/proyectos/{{pid}}/etiquetas
```

Guarda su id en `{{eid}}`. El color va en formato #RRGGBB.

- **Permiso:** miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Guarda:** `{{eid}}`
- **Respuesta esperada:** `201`

**Body:**

```json
{
  "nombre": "frontend",
  "color": "#3b82f6"
}
```

**Respuesta (201):**

```json
{
  "id": 1,
  "proyecto_id": 1,
  "nombre": "frontend",
  "color": "#3b82f6"
}
```

#### 19. Crear otra etiqueta

```http
POST {{url}}/proyectos/{{pid}}/etiquetas
```

Guarda su id en `{{eid2}}`.

- **Permiso:** miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Guarda:** `{{eid2}}`
- **Respuesta esperada:** `201`

**Body:**

```json
{
  "nombre": "urgente",
  "color": "#ef4444"
}
```

**Respuesta (201):**

```json
{
  "id": 2,
  "proyecto_id": 1,
  "nombre": "urgente",
  "color": "#ef4444"
}
```

#### 20. Listar etiquetas

```http
GET {{url}}/proyectos/{{pid}}/etiquetas
```

Etiquetas del proyecto y en cuántas tareas se usan.

- **Permiso:** observador, miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Respuesta (200):**

```json
[
  {
    "id": 1,
    "proyecto_id": 1,
    "nombre": "frontend",
    "color": "#3b82f6",
    "total_tareas": 0
  },
  {
    "id": 2,
    "proyecto_id": 1,
    "nombre": "urgente",
    "color": "#ef4444",
    "total_tareas": 0
  }
]
```

### 5. Sprints

Iteraciones de trabajo. Solo puede haber un sprint activo por proyecto.

#### 21. Crear sprint

```http
POST {{url}}/proyectos/{{pid}}/sprints
```

Guarda su id en `{{sid}}`. Si no envías nombre se llama "Sprint N". Fechas en formato AAAA-MM-DD (opcionales).

- **Permiso:** admin
- **Token:** `Bearer {{token}}` (Ana)
- **Guarda:** `{{sid}}`
- **Respuesta esperada:** `201`

**Body:**

```json
{
  "nombre": "Sprint 1",
  "objetivo": "Página de inicio y login"
}
```

**Respuesta (201):**

```json
{
  "id": 1,
  "proyecto_id": 1,
  "nombre": "Sprint 1",
  "objetivo": "Página de inicio y login",
  "estado": "planificado",
  "fecha_inicio": null,
  "fecha_fin": null,
  "creado_en": "2026-10-17T06:01:41.211Z",
  "total_tareas": 0,
  "tareas_hechas": 0,
  "puntos_totales": 0,
  "puntos_hechos": 0
}
```

#### 22. Listar sprints

```http
GET {{url}}/proyectos/{{pid}}/sprints
```

Sprints con totales de tareas y puntos.

- **Permiso:** observador, miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Respuesta (200):**

```json
[
  {
    "id": 1,
    "proyecto_id": 1,
    "nombre": "Sprint 1",
    "objetivo": "Página de inicio y login",
    "estado": "planificado",
    "fecha_inicio": null,
    "fecha_fin": null,
    "creado_en": "2026-10-17T06:01:41.211Z",
    "total_tareas": 0,
    "tareas_hechas": 0,
    "puntos_totales": 0,
    "puntos_hechos": 0
  }
]
```

#### 23. Ver sprint

```http
GET {{url}}/sprints/{{sid}}
```

Detalle del sprint con su resumen.

- **Permiso:** observador, miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Respuesta (200):**

```json
{
  "id": 1,
  "proyecto_id": 1,
  "nombre": "Sprint 1",
  "objetivo": "Página de inicio y login",
  "estado": "planificado",
  "fecha_inicio": null,
  "fecha_fin": null,
  "creado_en": "2026-10-17T06:01:41.211Z",
  "total_tareas": 0,
  "tareas_hechas": 0,
  "puntos_totales": 0,
  "puntos_hechos": 0
}
```

#### 24. Editar sprint

```http
PATCH {{url}}/sprints/{{sid}}
```

No se puede editar un sprint cerrado.

- **Permiso:** admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Body:**

```json
{
  "objetivo": "Página de inicio, login y formulario de contacto"
}
```

**Respuesta (200):**

```json
{
  "id": 1,
  "proyecto_id": 1,
  "nombre": "Sprint 1",
  "objetivo": "Página de inicio, login y formulario de contacto",
  "estado": "planificado",
  "fecha_inicio": null,
  "fecha_fin": null,
  "creado_en": "2026-10-17T06:01:41.211Z",
  "total_tareas": 0,
  "tareas_hechas": 0,
  "puntos_totales": 0,
  "puntos_hechos": 0
}
```

### 6. Tareas

Crear, estimar (puntos), asignar y mover tareas.

#### 25. Crear épica

```http
POST {{url}}/proyectos/{{pid}}/tareas
```

Una épica agrupa varias historias. Guarda su id en `{{epica_id}}`.

- **Permiso:** miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Guarda:** `{{epica_id}}`
- **Respuesta esperada:** `201`

**Body:**

```json
{
  "titulo": "Autenticación de usuarios",
  "tipo": "epica",
  "prioridad": "alta"
}
```

**Respuesta (201):**

```json
{
  "id": 1,
  "proyecto_id": 1,
  "clave": "WEB-1",
  "numero": 1,
  "titulo": "Autenticación de usuarios",
  "descripcion": null,
  "tipo": "epica",
  "prioridad": "alta",
  "estado": "por_hacer",
  "puntos": null,
  "asignado_id": null,
  "reportador_id": 1,
  "sprint_id": null,
  "padre_id": null,
  "fecha_limite": null,
  "orden": 1,
  "creado_en": "2026-10-17T06:01:41.286Z",
  "actualizado_en": "2026-10-17T06:01:41.286Z",
  "asignado": null,
  "reportador": {
    "id": 1,
    "nombre": "Ana Pérez"
  },
  "etiquetas": [],
  "total_comentarios": 0,
  "total_hijas": 0,
  "hijas": [],
  "puntos_hijas": 0,
  "padre": null
}
```

#### 26. Crear historia (con puntos, asignada y en el sprint)

```http
POST {{url}}/proyectos/{{pid}}/tareas
```

Tarea completa: dificultad de 5 puntos, asignada a Luis, dentro del sprint, hija de la épica y con etiqueta. Guarda su id en `{{tid}}`.

- **Permiso:** miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Guarda:** `{{tid}}`
- **Respuesta esperada:** `201`

**Body:**

```json
{
  "titulo": "Pantalla de inicio de sesión",
  "descripcion": "Formulario con correo y contraseña, con validaciones",
  "tipo": "historia",
  "prioridad": "alta",
  "puntos": 5,
  "asignado_id": {{luis_id}},
  "sprint_id": {{sid}},
  "padre_id": {{epica_id}},
  "fecha_limite": "2026-12-15",
  "etiquetas": [
    {{eid}}
  ]
}
```

**Respuesta (201):**

```json
{
  "id": 2,
  "proyecto_id": 1,
  "clave": "WEB-2",
  "numero": 2,
  "titulo": "Pantalla de inicio de sesión",
  "descripcion": "Formulario con correo y contraseña, con validaciones",
  "tipo": "historia",
  "prioridad": "alta",
  "estado": "por_hacer",
  "puntos": 5,
  "asignado_id": 2,
  "reportador_id": 1,
  "sprint_id": 1,
  "padre_id": 1,
  "fecha_limite": "2026-12-15",
  "orden": 1,
  "creado_en": "2026-10-17T06:01:41.325Z",
  "actualizado_en": "2026-10-17T06:01:41.325Z",
  "asignado": {
    "id": 2,
    "nombre": "Luis Gómez",
    "avatar_url": null
  },
  "reportador": {
    "id": 1,
    "nombre": "Ana Pérez"
  },
  "etiquetas": [
    {
      "id": 1,
      "nombre": "frontend",
      "color": "#3b82f6"
    }
  ],
  "total_comentarios": 0,
  "total_hijas": 0,
  "hijas": [],
  "puntos_hijas": 0,
  "padre": {
    "id": 1,
    "clave": "WEB-1",
    "titulo": "Autenticación de usuarios",
    "tipo": "epica"
  }
}
```

#### 27. Crear bug

```http
POST {{url}}/proyectos/{{pid}}/tareas
```

Bug crítico de 3 puntos en el sprint, sin asignar. Guarda su id en `{{tid2}}`.

- **Permiso:** miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Guarda:** `{{tid2}}`
- **Respuesta esperada:** `201`

**Body:**

```json
{
  "titulo": "El menú no se ve en celulares",
  "tipo": "bug",
  "prioridad": "critica",
  "puntos": 3,
  "sprint_id": {{sid}}
}
```

**Respuesta (201):**

```json
{
  "id": 3,
  "proyecto_id": 1,
  "clave": "WEB-3",
  "numero": 3,
  "titulo": "El menú no se ve en celulares",
  "descripcion": null,
  "tipo": "bug",
  "prioridad": "critica",
  "estado": "por_hacer",
  "puntos": 3,
  "asignado_id": null,
  "reportador_id": 1,
  "sprint_id": 1,
  "padre_id": null,
  "fecha_limite": null,
  "orden": 2,
  "creado_en": "2026-10-17T06:01:41.363Z",
  "actualizado_en": "2026-10-17T06:01:41.363Z",
  "asignado": null,
  "reportador": {
    "id": 1,
    "nombre": "Ana Pérez"
  },
  "etiquetas": [],
  "total_comentarios": 0,
  "total_hijas": 0,
  "hijas": [],
  "puntos_hijas": 0,
  "padre": null
}
```

#### 28. Crear subtarea

```http
POST {{url}}/proyectos/{{pid}}/tareas
```

Una subtarea siempre necesita `padre_id`. Guarda su id en `{{sub_id}}`.

- **Permiso:** miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Guarda:** `{{sub_id}}`
- **Respuesta esperada:** `201`

**Body:**

```json
{
  "titulo": "Validar formato del correo",
  "tipo": "subtarea",
  "puntos": 1,
  "padre_id": {{tid}}
}
```

**Respuesta (201):**

```json
{
  "id": 4,
  "proyecto_id": 1,
  "clave": "WEB-4",
  "numero": 4,
  "titulo": "Validar formato del correo",
  "descripcion": null,
  "tipo": "subtarea",
  "prioridad": "media",
  "estado": "por_hacer",
  "puntos": 1,
  "asignado_id": null,
  "reportador_id": 1,
  "sprint_id": null,
  "padre_id": 2,
  "fecha_limite": null,
  "orden": 2,
  "creado_en": "2026-10-17T06:01:41.378Z",
  "actualizado_en": "2026-10-17T06:01:41.378Z",
  "asignado": null,
  "reportador": {
    "id": 1,
    "nombre": "Ana Pérez"
  },
  "etiquetas": [],
  "total_comentarios": 0,
  "total_hijas": 0,
  "hijas": [],
  "puntos_hijas": 0,
  "padre": {
    "id": 2,
    "clave": "WEB-2",
    "titulo": "Pantalla de inicio de sesión",
    "tipo": "historia"
  }
}
```

#### 29. Crear tarea para el backlog

```http
POST {{url}}/proyectos/{{pid}}/tareas
```

Sin `sprint_id` la tarea queda en el backlog. Guarda su id en `{{tid3}}`.

- **Permiso:** miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Guarda:** `{{tid3}}`
- **Respuesta esperada:** `201`

**Body:**

```json
{
  "titulo": "Optimizar imágenes del sitio",
  "tipo": "tarea",
  "prioridad": "baja",
  "puntos": 2
}
```

**Respuesta (201):**

```json
{
  "id": 5,
  "proyecto_id": 1,
  "clave": "WEB-5",
  "numero": 5,
  "titulo": "Optimizar imágenes del sitio",
  "descripcion": null,
  "tipo": "tarea",
  "prioridad": "baja",
  "estado": "por_hacer",
  "puntos": 2,
  "asignado_id": null,
  "reportador_id": 1,
  "sprint_id": null,
  "padre_id": null,
  "fecha_limite": null,
  "orden": 3,
  "creado_en": "2026-10-17T06:01:41.410Z",
  "actualizado_en": "2026-10-17T06:01:41.410Z",
  "asignado": null,
  "reportador": {
    "id": 1,
    "nombre": "Ana Pérez"
  },
  "etiquetas": [],
  "total_comentarios": 0,
  "total_hijas": 0,
  "hijas": [],
  "puntos_hijas": 0,
  "padre": null
}
```

#### 30. Listar todas las tareas

```http
GET {{url}}/proyectos/{{pid}}/tareas
```

Ordenadas por prioridad. Acepta filtros (ver las siguientes peticiones).

- **Permiso:** observador, miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Respuesta (200):**

```json
[
  {
    "id": 3,
    "proyecto_id": 1,
    "clave": "WEB-3",
    "numero": 3,
    "titulo": "El menú no se ve en celulares",
    "descripcion": null,
    "tipo": "bug",
    "prioridad": "critica",
    "estado": "por_hacer",
    "puntos": 3,
    "asignado_id": null,
    "reportador_id": 1,
    "sprint_id": 1,
    "padre_id": null,
    "fecha_limite": null,
    "orden": 2,
    "creado_en": "2026-10-17T06:01:41.363Z",
    "actualizado_en": "2026-10-17T06:01:41.363Z",
    "asignado": null,
    "reportador": {
      "id": 1,
      "nombre": "Ana Pérez"
    },
    "etiquetas": [],
    "total_comentarios": 0,
    "total_hijas": 0
  },
  {
    "id": 2,
    "proyecto_id": 1,
    "clave": "WEB-2",
    "numero": 2,
    "titulo": "Pantalla de inicio de sesión",
    "descripcion": "Formulario con correo y contraseña, con validaciones",
    "tipo": "historia",
    "prioridad": "alta",
    "estado": "por_hacer",
    "puntos": 5,
    "asignado_id": 2,
    "reportador_id": 1,
    "sprint_id": 1,
    "padre_id": 1,
    "fecha_limite": "2026-12-15",
    "orden": 1,
    "creado_en": "2026-10-17T06:01:41.325Z",
    "actualizado_en": "2026-10-17T06:01:41.325Z",
    "asignado": {
      "id": 2,
      "nombre": "Luis Gómez",
      "avatar_url": null
    },
    "reportador": {
      "id": 1,
      "nombre": "Ana Pérez"
    },
    "etiquetas": [
      {
        "id": 1,
        "nombre": "frontend",
        "color": "#3b82f6"
      }
    ],
    "total_comentarios": 0,
    "total_hijas": 1
  },
  "… 3 más"
]
```

#### 31. Filtrar: mis tareas (como Luis)

```http
GET {{url}}/proyectos/{{pid}}/tareas?asignado=yo
```

Filtros: `asignado=yo|ninguno|<id>`, `estado`, `sprint=backlog|<id>`, `tipo`, `prioridad`, `q` (texto o clave).

- **Permiso:** observador, miembro, admin
- **Token:** `Bearer {{token_luis}}` (Luis)
- **Respuesta esperada:** `200`

**Respuesta (200):**

```json
[
  {
    "id": 2,
    "proyecto_id": 1,
    "clave": "WEB-2",
    "numero": 2,
    "titulo": "Pantalla de inicio de sesión",
    "descripcion": "Formulario con correo y contraseña, con validaciones",
    "tipo": "historia",
    "prioridad": "alta",
    "estado": "por_hacer",
    "puntos": 5,
    "asignado_id": 2,
    "reportador_id": 1,
    "sprint_id": 1,
    "padre_id": 1,
    "fecha_limite": "2026-12-15",
    "orden": 1,
    "creado_en": "2026-10-17T06:01:41.325Z",
    "actualizado_en": "2026-10-17T06:01:41.325Z",
    "asignado": {
      "id": 2,
      "nombre": "Luis Gómez",
      "avatar_url": null
    },
    "reportador": {
      "id": 1,
      "nombre": "Ana Pérez"
    },
    "etiquetas": [
      {
        "id": 1,
        "nombre": "frontend",
        "color": "#3b82f6"
      }
    ],
    "total_comentarios": 0,
    "total_hijas": 1
  }
]
```

#### 32. Filtrar: sin asignar

```http
GET {{url}}/proyectos/{{pid}}/tareas?asignado=ninguno
```

Tareas que nadie tiene asignadas.

- **Permiso:** observador, miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Respuesta (200):**

```json
[
  {
    "id": 3,
    "proyecto_id": 1,
    "clave": "WEB-3",
    "numero": 3,
    "titulo": "El menú no se ve en celulares",
    "descripcion": null,
    "tipo": "bug",
    "prioridad": "critica",
    "estado": "por_hacer",
    "puntos": 3,
    "asignado_id": null,
    "reportador_id": 1,
    "sprint_id": 1,
    "padre_id": null,
    "fecha_limite": null,
    "orden": 2,
    "creado_en": "2026-10-17T06:01:41.363Z",
    "actualizado_en": "2026-10-17T06:01:41.363Z",
    "asignado": null,
    "reportador": {
      "id": 1,
      "nombre": "Ana Pérez"
    },
    "etiquetas": [],
    "total_comentarios": 0,
    "total_hijas": 0
  },
  {
    "id": 1,
    "proyecto_id": 1,
    "clave": "WEB-1",
    "numero": 1,
    "titulo": "Autenticación de usuarios",
    "descripcion": null,
    "tipo": "epica",
    "prioridad": "alta",
    "estado": "por_hacer",
    "puntos": null,
    "asignado_id": null,
    "reportador_id": 1,
    "sprint_id": null,
    "padre_id": null,
    "fecha_limite": null,
    "orden": 1,
    "creado_en": "2026-10-17T06:01:41.286Z",
    "actualizado_en": "2026-10-17T06:01:41.286Z",
    "asignado": null,
    "reportador": {
      "id": 1,
      "nombre": "Ana Pérez"
    },
    "etiquetas": [],
    "total_comentarios": 0,
    "total_hijas": 1
  },
  "… 2 más"
]
```

#### 33. Filtrar: bugs

```http
GET {{url}}/proyectos/{{pid}}/tareas?tipo=bug
```

Solo tareas de tipo bug.

- **Permiso:** observador, miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Respuesta (200):**

```json
[
  {
    "id": 3,
    "proyecto_id": 1,
    "clave": "WEB-3",
    "numero": 3,
    "titulo": "El menú no se ve en celulares",
    "descripcion": null,
    "tipo": "bug",
    "prioridad": "critica",
    "estado": "por_hacer",
    "puntos": 3,
    "asignado_id": null,
    "reportador_id": 1,
    "sprint_id": 1,
    "padre_id": null,
    "fecha_limite": null,
    "orden": 2,
    "creado_en": "2026-10-17T06:01:41.363Z",
    "actualizado_en": "2026-10-17T06:01:41.363Z",
    "asignado": null,
    "reportador": {
      "id": 1,
      "nombre": "Ana Pérez"
    },
    "etiquetas": [],
    "total_comentarios": 0,
    "total_hijas": 0
  }
]
```

#### 34. Buscar por texto o clave

```http
GET {{url}}/proyectos/{{pid}}/tareas?q=login
```

Busca en el título o en la clave (por ejemplo `q=WEB-2`).

- **Permiso:** observador, miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Respuesta (200):**

```json
[]
```

#### 35. Ver backlog

```http
GET {{url}}/proyectos/{{pid}}/backlog
```

Tareas sin sprint (sin subtareas), con el total de puntos y cuántas faltan por estimar.

- **Permiso:** observador, miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Respuesta (200):**

```json
{
  "tareas": [
    {
      "id": 1,
      "proyecto_id": 1,
      "clave": "WEB-1",
      "numero": 1,
      "titulo": "Autenticación de usuarios",
      "descripcion": null,
      "tipo": "epica",
      "prioridad": "alta",
      "estado": "por_hacer",
      "puntos": null,
      "asignado_id": null,
      "reportador_id": 1,
      "sprint_id": null,
      "padre_id": null,
      "fecha_limite": null,
      "orden": 1,
      "creado_en": "2026-10-17T06:01:41.286Z",
      "actualizado_en": "2026-10-17T06:01:41.286Z",
      "asignado": null,
      "reportador": {
        "id": 1,
        "nombre": "Ana Pérez"
      },
      "etiquetas": [],
      "total_comentarios": 0,
      "total_hijas": 1
    },
    {
      "id": 5,
      "proyecto_id": 1,
      "clave": "WEB-5",
      "numero": 5,
      "titulo": "Optimizar imágenes del sitio",
      "descripcion": null,
      "tipo": "tarea",
      "prioridad": "baja",
      "estado": "por_hacer",
      "puntos": 2,
      "asignado_id": null,
      "reportador_id": 1,
      "sprint_id": null,
      "padre_id": null,
      "fecha_limite": null,
      "orden": 3,
      "creado_en": "2026-10-17T06:01:41.410Z",
      "actualizado_en": "2026-10-17T06:01:41.410Z",
      "asignado": null,
      "reportador": {
        "id": 1,
        "nombre": "Ana Pérez"
      },
      "etiquetas": [],
      "total_comentarios": 0,
      "total_hijas": 0
    }
  ],
  "puntos_totales": 2,
  "sin_estimar": 0
}
```

#### 36. Ver tarea

```http
GET {{url}}/tareas/{{tid}}
```

Detalle con padre, hijas y `puntos_hijas`.

- **Permiso:** observador, miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Respuesta (200):**

```json
{
  "id": 2,
  "proyecto_id": 1,
  "clave": "WEB-2",
  "numero": 2,
  "titulo": "Pantalla de inicio de sesión",
  "descripcion": "Formulario con correo y contraseña, con validaciones",
  "tipo": "historia",
  "prioridad": "alta",
  "estado": "por_hacer",
  "puntos": 5,
  "asignado_id": 2,
  "reportador_id": 1,
  "sprint_id": 1,
  "padre_id": 1,
  "fecha_limite": "2026-12-15",
  "orden": 1,
  "creado_en": "2026-10-17T06:01:41.325Z",
  "actualizado_en": "2026-10-17T06:01:41.325Z",
  "asignado": {
    "id": 2,
    "nombre": "Luis Gómez",
    "avatar_url": null
  },
  "reportador": {
    "id": 1,
    "nombre": "Ana Pérez"
  },
  "etiquetas": [
    {
      "id": 1,
      "nombre": "frontend",
      "color": "#3b82f6"
    }
  ],
  "total_comentarios": 0,
  "total_hijas": 1,
  "hijas": [
    {
      "id": 4,
      "proyecto_id": 1,
      "clave": "WEB-4",
      "numero": 4,
      "titulo": "Validar formato del correo",
      "descripcion": null,
      "tipo": "subtarea",
      "prioridad": "media",
      "estado": "por_hacer",
      "puntos": 1,
      "asignado_id": null,
      "reportador_id": 1,
      "sprint_id": null,
      "padre_id": 2,
      "fecha_limite": null,
      "orden": 2,
      "creado_en": "2026-10-17T06:01:41.378Z",
      "actualizado_en": "2026-10-17T06:01:41.378Z",
      "asignado": null,
      "reportador": {
        "id": 1,
        "nombre": "Ana Pérez"
      },
      "etiquetas": [],
      "total_comentarios": 0,
      "total_hijas": 0
    }
  ],
  "puntos_hijas": 1,
  "padre": {
    "id": 1,
    "clave": "WEB-1",
    "titulo": "Autenticación de usuarios",
    "tipo": "epica"
  }
}
```

#### 37. Editar tarea (cambiar puntos y prioridad)

```http
PATCH {{url}}/tareas/{{tid}}
```

Campos editables: titulo, descripcion, tipo, prioridad, puntos, sprint_id, padre_id, fecha_limite. Envía solo los que cambian.

- **Permiso:** miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Body:**

```json
{
  "puntos": 8,
  "prioridad": "critica"
}
```

**Respuesta (200):**

```json
{
  "id": 2,
  "proyecto_id": 1,
  "clave": "WEB-2",
  "numero": 2,
  "titulo": "Pantalla de inicio de sesión",
  "descripcion": "Formulario con correo y contraseña, con validaciones",
  "tipo": "historia",
  "prioridad": "critica",
  "estado": "por_hacer",
  "puntos": 8,
  "asignado_id": 2,
  "reportador_id": 1,
  "sprint_id": 1,
  "padre_id": 1,
  "fecha_limite": "2026-12-15",
  "orden": 1,
  "creado_en": "2026-10-17T06:01:41.325Z",
  "actualizado_en": "2026-10-17T06:01:41.547Z",
  "asignado": {
    "id": 2,
    "nombre": "Luis Gómez",
    "avatar_url": null
  },
  "reportador": {
    "id": 1,
    "nombre": "Ana Pérez"
  },
  "etiquetas": [
    {
      "id": 1,
      "nombre": "frontend",
      "color": "#3b82f6"
    }
  ],
  "total_comentarios": 0,
  "total_hijas": 1,
  "hijas": [
    {
      "id": 4,
      "proyecto_id": 1,
      "clave": "WEB-4",
      "numero": 4,
      "titulo": "Validar formato del correo",
      "descripcion": null,
      "tipo": "subtarea",
      "prioridad": "media",
      "estado": "por_hacer",
      "puntos": 1,
      "asignado_id": null,
      "reportador_id": 1,
      "sprint_id": null,
      "padre_id": 2,
      "fecha_limite": null,
      "orden": 2,
      "creado_en": "2026-10-17T06:01:41.378Z",
      "actualizado_en": "2026-10-17T06:01:41.378Z",
      "asignado": null,
      "reportador": {
        "id": 1,
        "nombre": "Ana Pérez"
      },
      "etiquetas": [],
      "total_comentarios": 0,
      "total_hijas": 0
    }
  ],
  "puntos_hijas": 1,
  "padre": {
    "id": 1,
    "clave": "WEB-1",
    "titulo": "Autenticación de usuarios",
    "tipo": "epica"
  }
}
```

#### 38. Asignar bug a Luis

```http
PATCH {{url}}/tareas/{{tid2}}/asignar
```

Si el miembro supera su capacidad de puntos en el sprint, la respuesta trae `advertencia` (aquí: 8 + 3 = 11 > 10).

- **Permiso:** miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Body:**

```json
{
  "asignado_id": {{luis_id}}
}
```

**Respuesta (200):**

```json
{
  "id": 3,
  "proyecto_id": 1,
  "clave": "WEB-3",
  "numero": 3,
  "titulo": "El menú no se ve en celulares",
  "descripcion": null,
  "tipo": "bug",
  "prioridad": "critica",
  "estado": "por_hacer",
  "puntos": 3,
  "asignado_id": 2,
  "reportador_id": 1,
  "sprint_id": 1,
  "padre_id": null,
  "fecha_limite": null,
  "orden": 2,
  "creado_en": "2026-10-17T06:01:41.363Z",
  "actualizado_en": "2026-10-17T06:01:41.599Z",
  "asignado": {
    "id": 2,
    "nombre": "Luis Gómez",
    "avatar_url": null
  },
  "reportador": {
    "id": 1,
    "nombre": "Ana Pérez"
  },
  "etiquetas": [],
  "total_comentarios": 0,
  "total_hijas": 0,
  "hijas": [],
  "puntos_hijas": 0,
  "padre": null,
  "advertencia": "El miembro tiene 11 puntos asignados en este sprint y su capacidad es 10"
}
```

#### 39. Reasignar bug a Ana

```http
PATCH {{url}}/tareas/{{tid2}}/asignar
```

Cambia el responsable. Con `null` la tarea queda sin asignar.

- **Permiso:** miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Body:**

```json
{
  "asignado_id": {{ana_id}}
}
```

**Respuesta (200):**

```json
{
  "id": 3,
  "proyecto_id": 1,
  "clave": "WEB-3",
  "numero": 3,
  "titulo": "El menú no se ve en celulares",
  "descripcion": null,
  "tipo": "bug",
  "prioridad": "critica",
  "estado": "por_hacer",
  "puntos": 3,
  "asignado_id": 1,
  "reportador_id": 1,
  "sprint_id": 1,
  "padre_id": null,
  "fecha_limite": null,
  "orden": 2,
  "creado_en": "2026-10-17T06:01:41.363Z",
  "actualizado_en": "2026-10-17T06:01:41.630Z",
  "asignado": {
    "id": 1,
    "nombre": "Ana Pérez",
    "avatar_url": null
  },
  "reportador": {
    "id": 1,
    "nombre": "Ana Pérez"
  },
  "etiquetas": [],
  "total_comentarios": 0,
  "total_hijas": 0,
  "hijas": [],
  "puntos_hijas": 0,
  "padre": null,
  "advertencia": null
}
```

#### 40. Mover tarea a "en progreso"

```http
PATCH {{url}}/tareas/{{tid}}/mover
```

Estados: por_hacer, en_progreso, en_revision, hecho. `orden` (opcional) es la posición en la columna.

- **Permiso:** miembro, admin
- **Token:** `Bearer {{token_luis}}` (Luis)
- **Respuesta esperada:** `200`

**Body:**

```json
{
  "estado": "en_progreso"
}
```

**Respuesta (200):**

```json
{
  "id": 2,
  "proyecto_id": 1,
  "clave": "WEB-2",
  "numero": 2,
  "titulo": "Pantalla de inicio de sesión",
  "descripcion": "Formulario con correo y contraseña, con validaciones",
  "tipo": "historia",
  "prioridad": "critica",
  "estado": "en_progreso",
  "puntos": 8,
  "asignado_id": 2,
  "reportador_id": 1,
  "sprint_id": 1,
  "padre_id": 1,
  "fecha_limite": "2026-12-15",
  "orden": 1,
  "creado_en": "2026-10-17T06:01:41.325Z",
  "actualizado_en": "2026-10-17T06:01:41.662Z",
  "asignado": {
    "id": 2,
    "nombre": "Luis Gómez",
    "avatar_url": null
  },
  "reportador": {
    "id": 1,
    "nombre": "Ana Pérez"
  },
  "etiquetas": [
    {
      "id": 1,
      "nombre": "frontend",
      "color": "#3b82f6"
    }
  ],
  "total_comentarios": 0,
  "total_hijas": 1,
  "hijas": [
    {
      "id": 4,
      "proyecto_id": 1,
      "clave": "WEB-4",
      "numero": 4,
      "titulo": "Validar formato del correo",
      "descripcion": null,
      "tipo": "subtarea",
      "prioridad": "media",
      "estado": "por_hacer",
      "puntos": 1,
      "asignado_id": null,
      "reportador_id": 1,
      "sprint_id": null,
      "padre_id": 2,
      "fecha_limite": null,
      "orden": 2,
      "creado_en": "2026-10-17T06:01:41.378Z",
      "actualizado_en": "2026-10-17T06:01:41.378Z",
      "asignado": null,
      "reportador": {
        "id": 1,
        "nombre": "Ana Pérez"
      },
      "etiquetas": [],
      "total_comentarios": 0,
      "total_hijas": 0
    }
  ],
  "puntos_hijas": 1,
  "padre": {
    "id": 1,
    "clave": "WEB-1",
    "titulo": "Autenticación de usuarios",
    "tipo": "epica"
  }
}
```

#### 41. Mover bug a "hecho"

```http
PATCH {{url}}/tareas/{{tid2}}/mover
```

Lo usa el tablero Kanban al arrastrar una tarjeta.

- **Permiso:** miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Body:**

```json
{
  "estado": "hecho",
  "orden": 0
}
```

**Respuesta (200):**

```json
{
  "id": 3,
  "proyecto_id": 1,
  "clave": "WEB-3",
  "numero": 3,
  "titulo": "El menú no se ve en celulares",
  "descripcion": null,
  "tipo": "bug",
  "prioridad": "critica",
  "estado": "hecho",
  "puntos": 3,
  "asignado_id": 1,
  "reportador_id": 1,
  "sprint_id": 1,
  "padre_id": null,
  "fecha_limite": null,
  "orden": 0,
  "creado_en": "2026-10-17T06:01:41.363Z",
  "actualizado_en": "2026-10-17T06:01:41.692Z",
  "asignado": {
    "id": 1,
    "nombre": "Ana Pérez",
    "avatar_url": null
  },
  "reportador": {
    "id": 1,
    "nombre": "Ana Pérez"
  },
  "etiquetas": [],
  "total_comentarios": 0,
  "total_hijas": 0,
  "hijas": [],
  "puntos_hijas": 0,
  "padre": null
}
```

#### 42. Poner etiquetas a una tarea

```http
PUT {{url}}/tareas/{{tid2}}/etiquetas
```

Reemplaza todas las etiquetas de la tarea por la lista enviada.

- **Permiso:** miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Body:**

```json
{
  "etiquetas": [
    {{eid}},
    {{eid2}}
  ]
}
```

**Respuesta (200):**

```json
[
  {
    "id": 1,
    "nombre": "frontend",
    "color": "#3b82f6"
  },
  {
    "id": 2,
    "nombre": "urgente",
    "color": "#ef4444"
  }
]
```

#### 43. Historial de la tarea

```http
GET {{url}}/tareas/{{tid}}/historial
```

Todos los cambios: quién, cuándo y qué valores cambiaron.

- **Permiso:** observador, miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Respuesta (200):**

```json
[
  {
    "id": 9,
    "accion": "estado",
    "cambios": {
      "estado": {
        "a": "en_progreso",
        "de": "por_hacer"
      }
    },
    "creado_en": "2026-10-17T06:01:41.662Z",
    "usuario": {
      "id": 2,
      "nombre": "Luis Gómez"
    }
  },
  {
    "id": 6,
    "accion": "editada",
    "cambios": {
      "puntos": {
        "a": 8,
        "de": 5
      },
      "prioridad": {
        "a": "critica",
        "de": "alta"
      }
    },
    "creado_en": "2026-10-17T06:01:41.547Z",
    "usuario": {
      "id": 1,
      "nombre": "Ana Pérez"
    }
  },
  "… 1 más"
]
```

### 7. Comentarios

Conversación dentro de una tarea.

#### 44. Comentar tarea (como Luis)

```http
POST {{url}}/tareas/{{tid}}/comentarios
```

Guarda el id en `{{cid}}`.

- **Permiso:** miembro, admin
- **Token:** `Bearer {{token_luis}}` (Luis)
- **Guarda:** `{{cid}}`
- **Respuesta esperada:** `201`

**Body:**

```json
{
  "contenido": "Ya tengo listo el diseño del formulario, empiezo con las validaciones."
}
```

**Respuesta (201):**

```json
{
  "id": 1,
  "tarea_id": 2,
  "contenido": "Ya tengo listo el diseño del formulario, empiezo con las validaciones.",
  "creado_en": "2026-10-17T06:01:41.753Z",
  "actualizado_en": null,
  "autor": {
    "id": 2,
    "nombre": "Luis Gómez",
    "avatar_url": null
  }
}
```

#### 45. Listar comentarios

```http
GET {{url}}/tareas/{{tid}}/comentarios
```

Comentarios en orden cronológico.

- **Permiso:** observador, miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Respuesta (200):**

```json
[
  {
    "id": 1,
    "tarea_id": 2,
    "contenido": "Ya tengo listo el diseño del formulario, empiezo con las validaciones.",
    "creado_en": "2026-10-17T06:01:41.753Z",
    "actualizado_en": null,
    "autor": {
      "id": 2,
      "nombre": "Luis Gómez",
      "avatar_url": null
    }
  }
]
```

#### 46. Editar comentario (como Luis)

```http
PATCH {{url}}/comentarios/{{cid}}
```

Solo el autor puede editarlo.

- **Permiso:** Solo el autor
- **Token:** `Bearer {{token_luis}}` (Luis)
- **Respuesta esperada:** `200`

**Body:**

```json
{
  "contenido": "Diseño listo. Validaciones en progreso, termino mañana."
}
```

**Respuesta (200):**

```json
{
  "id": 1,
  "tarea_id": 2,
  "contenido": "Diseño listo. Validaciones en progreso, termino mañana.",
  "creado_en": "2026-10-17T06:01:41.753Z",
  "actualizado_en": "2026-10-17T06:01:41.799Z",
  "autor": {
    "id": 2,
    "nombre": "Luis Gómez",
    "avatar_url": null
  }
}
```

### 8. Tablero y reportes

Vistas para el tablero Kanban y las métricas del equipo.

#### 47. Iniciar sprint

```http
POST {{url}}/sprints/{{sid}}/iniciar
```

Pone el sprint en "activo" con fecha de inicio hoy. `fecha_fin` es opcional (por defecto, 2 semanas).

- **Permiso:** admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Body:**

```json
{}
```

**Respuesta (200):**

```json
{
  "id": 1,
  "proyecto_id": 1,
  "nombre": "Sprint 1",
  "objetivo": "Página de inicio, login y formulario de contacto",
  "estado": "activo",
  "fecha_inicio": "2026-10-17",
  "fecha_fin": "2026-10-30",
  "creado_en": "2026-10-17T06:01:41.211Z",
  "total_tareas": 2,
  "tareas_hechas": 1,
  "puntos_totales": 11,
  "puntos_hechos": 3
}
```

#### 48. Tablero Kanban

```http
GET {{url}}/sprints/{{sid}}/tablero
```

Tareas del sprint agrupadas en columnas por estado.

- **Permiso:** observador, miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Respuesta (200):**

```json
{
  "sprint": {
    "id": 1,
    "proyecto_id": 1,
    "nombre": "Sprint 1",
    "objetivo": "Página de inicio, login y formulario de contacto",
    "estado": "activo",
    "fecha_inicio": "2026-10-17",
    "fecha_fin": "2026-10-30",
    "creado_en": "2026-10-17T06:01:41.211Z",
    "total_tareas": 2,
    "tareas_hechas": 1,
    "puntos_totales": 11,
    "puntos_hechos": 3
  },
  "columnas": {
    "por_hacer": [],
    "en_progreso": [
      {
        "id": 2,
        "proyecto_id": 1,
        "clave": "WEB-2",
        "numero": 2,
        "titulo": "Pantalla de inicio de sesión",
        "descripcion": "Formulario con correo y contraseña, con validaciones",
        "tipo": "historia",
        "prioridad": "critica",
        "estado": "en_progreso",
        "puntos": 8,
        "asignado_id": 2,
        "reportador_id": 1,
        "sprint_id": 1,
        "padre_id": 1,
        "fecha_limite": "2026-12-15",
        "orden": 1,
        "creado_en": "2026-10-17T06:01:41.325Z",
        "actualizado_en": "2026-10-17T06:01:41.662Z",
        "asignado": {
          "id": 2,
          "nombre": "Luis Gómez",
          "avatar_url": null
        },
        "reportador": {
          "id": 1,
          "nombre": "Ana Pérez"
        },
        "etiquetas": [
          {
            "id": 1,
            "nombre": "frontend",
            "color": "#3b82f6"
          }
        ],
        "total_comentarios": 1,
        "total_hijas": 1
      }
    ],
    "en_revision": [],
    "hecho": [
      {
        "id": 3,
        "proyecto_id": 1,
        "clave": "WEB-3",
        "numero": 3,
        "titulo": "El menú no se ve en celulares",
        "descripcion": null,
        "tipo": "bug",
        "prioridad": "critica",
        "estado": "hecho",
        "puntos": 3,
        "asignado_id": 1,
        "reportador_id": 1,
        "sprint_id": 1,
        "padre_id": null,
        "fecha_limite": null,
        "orden": 0,
        "creado_en": "2026-10-17T06:01:41.363Z",
        "actualizado_en": "2026-10-17T06:01:41.692Z",
        "asignado": {
          "id": 1,
          "nombre": "Ana Pérez",
          "avatar_url": null
        },
        "reportador": {
          "id": 1,
          "nombre": "Ana Pérez"
        },
        "etiquetas": [
          {
            "id": 1,
            "nombre": "frontend",
            "color": "#3b82f6"
          },
          {
            "id": 2,
            "nombre": "urgente",
            "color": "#ef4444"
          }
        ],
        "total_comentarios": 0,
        "total_hijas": 0
      }
    ]
  }
}
```

#### 49. Carga por miembro

```http
GET {{url}}/proyectos/{{pid}}/reportes/carga
```

Puntos asignados frente a la capacidad de cada miembro en el sprint activo (o `?sprint=<id>`).

- **Permiso:** observador, miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Respuesta (200):**

```json
{
  "sprint": {
    "id": 1,
    "nombre": "Sprint 1",
    "estado": "activo"
  },
  "miembros": [
    {
      "id": 1,
      "nombre": "Ana Pérez",
      "avatar_url": null,
      "rol": "admin",
      "capacidad_puntos": 10,
      "tareas": 1,
      "puntos_asignados": 3,
      "puntos_hechos": 3,
      "porcentaje_capacidad": 30,
      "sobrecargado": false
    },
    "… 2 más"
  ],
  "sin_asignar": {
    "tareas": 0,
    "puntos": 0
  }
}
```

#### 50. Burndown del sprint

```http
GET {{url}}/sprints/{{sid}}/reportes/burndown
```

Puntos restantes por día y la línea ideal. Los días futuros vienen con `restante: null`.

- **Permiso:** observador, miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Respuesta (200):**

```json
{
  "sprint": {
    "id": 1,
    "nombre": "Sprint 1",
    "estado": "activo",
    "fecha_inicio": "2026-10-17",
    "fecha_fin": "2026-10-30"
  },
  "puntos_totales": 11,
  "dias": [
    {
      "fecha": "2026-10-17",
      "restante": 8,
      "ideal": 11
    },
    "… 13 más"
  ]
}
```

#### 51. Cerrar sprint

```http
POST {{url}}/sprints/{{sid}}/cerrar
```

Cierra el sprint. Las tareas que no están en "hecho" vuelven al backlog.

- **Permiso:** admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Body:**

```json
{}
```

**Respuesta (200):**

```json
{
  "id": 1,
  "proyecto_id": 1,
  "nombre": "Sprint 1",
  "objetivo": "Página de inicio, login y formulario de contacto",
  "estado": "cerrado",
  "fecha_inicio": "2026-10-17",
  "fecha_fin": "2026-10-17",
  "creado_en": "2026-10-17T06:01:41.211Z",
  "total_tareas": 1,
  "tareas_hechas": 1,
  "puntos_totales": 3,
  "puntos_hechos": 3,
  "tareas_devueltas_al_backlog": 1
}
```

#### 52. Velocidad del equipo

```http
GET {{url}}/proyectos/{{pid}}/reportes/velocidad
```

Puntos completados en cada sprint cerrado y el promedio.

- **Permiso:** observador, miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `200`

**Respuesta (200):**

```json
{
  "sprints": [
    {
      "id": 1,
      "nombre": "Sprint 1",
      "fecha_inicio": "2026-10-17",
      "fecha_fin": "2026-10-17",
      "puntos_completados": 3,
      "tareas_completadas": 1
    }
  ],
  "promedio": 3
}
```

### 9. Pruebas de errores

Todas deben FALLAR con el código indicado. Sirven para comprobar las validaciones y los permisos.

#### 53. ERROR 400 - Puntos inválidos

```http
POST {{url}}/proyectos/{{pid}}/tareas
```

4 no está en la serie 1, 2, 3, 5, 8, 13, 21.

- **Permiso:** miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `400`

**Body:**

```json
{
  "titulo": "Tarea mal estimada",
  "puntos": 4
}
```

**Respuesta (400):**

```json
{
  "error": "Datos inválidos",
  "detalles": [
    {
      "campo": "puntos",
      "mensaje": "Los puntos deben ser uno de: 1, 2, 3, 5, 8, 13, 21"
    }
  ]
}
```

#### 54. ERROR 400 - Subtarea sin padre

```http
POST {{url}}/proyectos/{{pid}}/tareas
```

Una subtarea necesita padre_id.

- **Permiso:** miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `400`

**Body:**

```json
{
  "titulo": "Subtarea huérfana",
  "tipo": "subtarea"
}
```

**Respuesta (400):**

```json
{
  "error": "Una subtarea necesita una tarea padre"
}
```

#### 55. ERROR 400 - Contraseña débil

```http
POST {{url}}/auth/registro
```

La contraseña necesita 8 caracteres con letras y números.

- **Permiso:** Pública
- **Token:** Sin token
- **Respuesta esperada:** `400`

**Body:**

```json
{
  "nombre": "Pedro",
  "correo": "pedro@prueba.com",
  "password": "123"
}
```

**Respuesta (400):**

```json
{
  "error": "Datos inválidos",
  "detalles": [
    {
      "campo": "password",
      "mensaje": "La contraseña debe tener al menos 8 caracteres"
    },
    {
      "campo": "password",
      "mensaje": "La contraseña debe incluir al menos una letra"
    }
  ]
}
```

#### 56. ERROR 401 - Sin token

```http
GET {{url}}/proyectos
```

Sin el header Authorization la API rechaza la petición.

- **Permiso:** —
- **Token:** Sin token
- **Respuesta esperada:** `401`

**Respuesta (401):**

```json
{
  "error": "Falta el token de acceso"
}
```

#### 57. ERROR 401 - Contraseña incorrecta

```http
POST {{url}}/auth/login
```

Mensaje genérico: no revela si el correo existe.

- **Permiso:** Pública
- **Token:** Sin token
- **Respuesta esperada:** `401`

**Body:**

```json
{
  "correo": "ana@prueba.com",
  "password": "Incorrecta1"
}
```

**Respuesta (401):**

```json
{
  "error": "Correo o contraseña incorrectos"
}
```

#### 58. ERROR 403 - Observadora intenta crear tarea

```http
POST {{url}}/proyectos/{{pid}}/tareas
```

Sofía es observadora: solo puede ver.

- **Permiso:** miembro, admin
- **Token:** `Bearer {{token_sofia}}` (Sofía)
- **Respuesta esperada:** `403`

**Body:**

```json
{
  "titulo": "Intento de Sofía"
}
```

**Respuesta (403):**

```json
{
  "error": "Se requiere rol miembro o superior en este proyecto"
}
```

#### 59. ERROR 403 - Miembro intenta agregar miembros

```http
POST {{url}}/proyectos/{{pid}}/miembros
```

Solo un admin gestiona miembros.

- **Permiso:** admin
- **Token:** `Bearer {{token_luis}}` (Luis)
- **Respuesta esperada:** `403`

**Body:**

```json
{
  "correo": "sofia@prueba.com"
}
```

**Respuesta (403):**

```json
{
  "error": "Se requiere rol admin o superior en este proyecto"
}
```

#### 60. ERROR 409 - Clave de proyecto repetida

```http
POST {{url}}/proyectos
```

La clave WEB ya existe.

- **Permiso:** Cualquier usuario con token
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `409`

**Body:**

```json
{
  "clave": "WEB",
  "nombre": "Otro proyecto"
}
```

**Respuesta (409):**

```json
{
  "error": "La clave WEB ya está en uso"
}
```

#### 61. ERROR 400 - Asignar a alguien que no es miembro

```http
PATCH {{url}}/tareas/{{tid3}}/asignar
```

Solo se puede asignar a miembros del proyecto. (id 999999 no existe)

- **Permiso:** miembro, admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `400`

**Body:**

```json
{
  "asignado_id": 999999
}
```

**Respuesta (400):**

```json
{
  "error": "El usuario asignado no es miembro del proyecto"
}
```

### 10. Eliminar (al final)

Borran datos. Ejecútalas solo cuando termines de probar.

#### 62. Eliminar comentario

```http
DELETE {{url}}/comentarios/{{cid}}
```

Responde 204 sin contenido.

- **Permiso:** Autor o admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `204`

**Respuesta (204):** sin contenido.

#### 63. Eliminar etiqueta

```http
DELETE {{url}}/proyectos/{{pid}}/etiquetas/{{eid2}}
```

También la quita de las tareas.

- **Permiso:** admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `204`

**Respuesta (204):** sin contenido.

#### 64. Eliminar tarea

```http
DELETE {{url}}/tareas/{{tid3}}
```

Borra la tarea y sus subtareas.

- **Permiso:** Creador de la tarea o admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `204`

**Respuesta (204):** sin contenido.

#### 65. Crear sprint para eliminar

```http
POST {{url}}/proyectos/{{pid}}/sprints
```

Sprint auxiliar. Guarda su id en `{{sid2}}`.

- **Permiso:** admin
- **Token:** `Bearer {{token}}` (Ana)
- **Guarda:** `{{sid2}}`
- **Respuesta esperada:** `201`

**Body:**

```json
{
  "objetivo": "Sprint de prueba"
}
```

**Respuesta (201):**

```json
{
  "id": 2,
  "proyecto_id": 1,
  "nombre": "Sprint 2",
  "objetivo": "Sprint de prueba",
  "estado": "planificado",
  "fecha_inicio": null,
  "fecha_fin": null,
  "creado_en": "2026-10-17T06:01:42.109Z",
  "total_tareas": 0,
  "tareas_hechas": 0,
  "puntos_totales": 0,
  "puntos_hechos": 0
}
```

#### 66. Eliminar sprint

```http
DELETE {{url}}/sprints/{{sid2}}
```

Solo sprints planificados. Sus tareas vuelven al backlog.

- **Permiso:** admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `204`

**Respuesta (204):** sin contenido.

#### 67. Quitar a Sofía del proyecto

```http
DELETE {{url}}/proyectos/{{pid}}/miembros/{{sofia_id}}
```

Sus tareas abiertas quedan sin asignar.

- **Permiso:** admin (o uno mismo para salir)
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `204`

**Respuesta (204):** sin contenido.

#### 68. Eliminar proyecto

```http
DELETE {{url}}/proyectos/{{pid}}
```

⚠ Borra el proyecto con TODAS sus tareas, sprints y comentarios.

- **Permiso:** admin
- **Token:** `Bearer {{token}}` (Ana)
- **Respuesta esperada:** `204`

**Respuesta (204):** sin contenido.
