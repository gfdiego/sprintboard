# SprintBoard

Gestión de proyectos ágiles al estilo Jira: proyectos, sprints, tablero, backlog y reportes.

| Carpeta | Qué es | Guía |
|---|---|---|
| [`backend/`](backend/) | API en Node.js + Express + PostgreSQL (Neon) | [backend/README.md](backend/README.md) |
| [`frontend/`](frontend/) | Interfaz en React + Vite + Tailwind | [frontend/README.md](frontend/README.md) |

## Empezar

```bash
git clone <url-del-repositorio>
cd sprintboard

# Backend
cd backend
npm install
cp .env.example .env      # y completa los valores (ver abajo)
npm run dev               # http://localhost:3000

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev               # http://localhost:5173
```

## El archivo `.env`

`backend/.env` tiene la conexión a la base de datos y los secretos. **Nunca se sube al
repositorio** (está en `.gitignore`). Cada persona crea el suyo a partir de `backend/.env.example`:

- `DATABASE_URL`: la cadena de conexión que te pase el dueño del proyecto de Neon,
  **por un canal privado**.
- `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET`: genera los tuyos (dos distintos) con
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
  No tienen que coincidir con los de tus compañeros.

## Trabajo en equipo

### Con Git
```bash
git pull                     # antes de empezar: trae los cambios de los demás
# ... trabajas ...
git add .
git commit -m "Qué hiciste"
git push                     # al terminar
```
Si `git pull` avisa de un conflicto, el archivo marcado tiene las dos versiones entre
`<<<<<<<` y `>>>>>>>`: deja la correcta, guarda, y haz `git add` + `git commit`.

### Con la base de datos compartida (Neon)
1. **Desarrollen en la rama `dev` de Neon**, no en `production`.
2. **Cada persona tiene su propio rol** de Neon (Roles → New role) en lugar de compartir la
   contraseña del dueño.
3. **Migraciones:** quien agregue un archivo en `backend/db/migraciones/` lo sube, avisa, y
   **una sola persona** ejecuta `npm run db:migrar`.
4. **Nunca pongan la base compartida en `DATABASE_URL_TEST`:** `npm test` borra todo el
   esquema de esa base. Usen otra rama de Neon (por ejemplo `test`).
5. **No ejecuten `npm run db:semilla`** en una base que ya tiene datos reales.
