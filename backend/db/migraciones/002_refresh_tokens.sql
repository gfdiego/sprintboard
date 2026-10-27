-- ===== Refresh tokens (sesiones) =====
-- Cada fila es una sesión abierta. El id es el "jti" del refresh token (JWT),
-- así se puede revocar un token concreto aunque su firma siga siendo válida.
CREATE TABLE refresh_tokens (
  id              UUID PRIMARY KEY,
  usuario_id      INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira_en       TIMESTAMPTZ NOT NULL,
  revocado_en     TIMESTAMPTZ,
  -- Al rotar, apunta al token que lo reemplazó (sirve para detectar reutilización)
  reemplazado_por UUID,
  ip              VARCHAR(45),
  agente          VARCHAR(255),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_refresh_tokens_usuario ON refresh_tokens(usuario_id);
