-- ===== Sesiones =====
-- Al rotar, cada refresh token es una fila nueva. sesion_id se conserva entre
-- rotaciones para identificar el mismo dispositivo y poder listarlo o cerrarlo.
ALTER TABLE refresh_tokens ADD COLUMN sesion_id UUID;
ALTER TABLE refresh_tokens ADD COLUMN sesion_inicio TIMESTAMPTZ;

UPDATE refresh_tokens SET sesion_id = id, sesion_inicio = creado_en;

ALTER TABLE refresh_tokens ALTER COLUMN sesion_id SET NOT NULL;
ALTER TABLE refresh_tokens ALTER COLUMN sesion_inicio SET NOT NULL;

CREATE INDEX ix_refresh_tokens_sesion ON refresh_tokens(sesion_id);
