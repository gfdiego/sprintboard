-- =========================================================
-- SprintBoard - Esquema inicial
-- =========================================================

-- ===== Tipos =====
CREATE TYPE rol_proyecto  AS ENUM ('admin', 'miembro', 'observador');
CREATE TYPE tipo_tarea    AS ENUM ('historia', 'tarea', 'bug', 'epica', 'subtarea');
CREATE TYPE prioridad     AS ENUM ('minima', 'baja', 'media', 'alta', 'critica');
CREATE TYPE estado_tarea  AS ENUM ('por_hacer', 'en_progreso', 'en_revision', 'hecho');
CREATE TYPE estado_sprint AS ENUM ('planificado', 'activo', 'cerrado');

-- ===== Usuarios =====
CREATE TABLE usuarios (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  correo         VARCHAR(150) NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  avatar_url     TEXT,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== Proyectos =====
CREATE TABLE proyectos (
  id              SERIAL PRIMARY KEY,
  clave           VARCHAR(10) NOT NULL UNIQUE,
  nombre          VARCHAR(120) NOT NULL,
  descripcion     TEXT,
  propietario_id  INT NOT NULL REFERENCES usuarios(id),
  contador_tareas INT NOT NULL DEFAULT 0,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE miembros_proyecto (
  proyecto_id      INT REFERENCES proyectos(id) ON DELETE CASCADE,
  usuario_id       INT REFERENCES usuarios(id)  ON DELETE CASCADE,
  rol              rol_proyecto NOT NULL DEFAULT 'miembro',
  capacidad_puntos INT NOT NULL DEFAULT 10 CHECK (capacidad_puntos >= 0),
  unido_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (proyecto_id, usuario_id)
);
CREATE INDEX ix_miembros_usuario ON miembros_proyecto(usuario_id);

-- ===== Sprints =====
CREATE TABLE sprints (
  id           SERIAL PRIMARY KEY,
  proyecto_id  INT NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  nombre       VARCHAR(100) NOT NULL,
  objetivo     TEXT,
  estado       estado_sprint NOT NULL DEFAULT 'planificado',
  fecha_inicio DATE,
  fecha_fin    DATE,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio)
);
-- Solo un sprint activo por proyecto
CREATE UNIQUE INDEX un_sprint_activo ON sprints(proyecto_id) WHERE estado = 'activo';

-- ===== Tareas =====
CREATE TABLE tareas (
  id             SERIAL PRIMARY KEY,
  proyecto_id    INT NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  numero         INT NOT NULL,
  titulo         VARCHAR(200) NOT NULL,
  descripcion    TEXT,
  tipo           tipo_tarea   NOT NULL DEFAULT 'tarea',
  prioridad      prioridad    NOT NULL DEFAULT 'media',
  estado         estado_tarea NOT NULL DEFAULT 'por_hacer',
  puntos         SMALLINT CHECK (puntos IN (1, 2, 3, 5, 8, 13, 21)),
  asignado_id    INT REFERENCES usuarios(id) ON DELETE SET NULL,
  reportador_id  INT NOT NULL REFERENCES usuarios(id),
  sprint_id      INT REFERENCES sprints(id) ON DELETE SET NULL,
  padre_id       INT REFERENCES tareas(id)  ON DELETE CASCADE,
  fecha_limite   DATE,
  orden          INT NOT NULL DEFAULT 0,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (proyecto_id, numero)
);
CREATE INDEX ix_tareas_tablero  ON tareas(sprint_id, estado, orden);
CREATE INDEX ix_tareas_asignado ON tareas(asignado_id);
CREATE INDEX ix_tareas_padre    ON tareas(padre_id);

-- ===== Etiquetas =====
CREATE TABLE etiquetas (
  id          SERIAL PRIMARY KEY,
  proyecto_id INT NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  nombre      VARCHAR(40) NOT NULL,
  color       VARCHAR(7)  NOT NULL DEFAULT '#6b7280',
  UNIQUE (proyecto_id, nombre)
);

CREATE TABLE tarea_etiquetas (
  tarea_id    INT REFERENCES tareas(id)    ON DELETE CASCADE,
  etiqueta_id INT REFERENCES etiquetas(id) ON DELETE CASCADE,
  PRIMARY KEY (tarea_id, etiqueta_id)
);

-- ===== Comentarios =====
CREATE TABLE comentarios (
  id             SERIAL PRIMARY KEY,
  tarea_id       INT NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  autor_id       INT NOT NULL REFERENCES usuarios(id),
  contenido      TEXT NOT NULL,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ
);
CREATE INDEX ix_comentarios_tarea ON comentarios(tarea_id);

-- ===== Adjuntos (rutas pendientes) =====
CREATE TABLE adjuntos (
  id           SERIAL PRIMARY KEY,
  tarea_id     INT NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  subido_por   INT NOT NULL REFERENCES usuarios(id),
  nombre       VARCHAR(255) NOT NULL,
  url          TEXT NOT NULL,
  tamano_bytes INT,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== Historial de cambios =====
CREATE TABLE historial (
  id         BIGSERIAL PRIMARY KEY,
  tarea_id   INT NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
  accion     VARCHAR(30) NOT NULL,
  cambios    JSONB NOT NULL DEFAULT '{}'::jsonb,
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_historial_tarea ON historial(tarea_id, creado_en);
