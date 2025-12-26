-- 002_dispositivos.sql
-- Tabla de dispositivos autorizados (tablets)

CREATE TABLE IF NOT EXISTS dispositivos (
  id text PRIMARY KEY,             -- ej: TABLET-01
  api_key text NOT NULL UNIQUE,     -- secreto compartido con la tablet
  nombre text,
  activo boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_dispositivos_last_seen
  ON dispositivos (last_seen_at DESC);

-- ⚠️ EJEMPLO de registro de una tablet
-- CAMBIA la api_key por un secreto largo antes de producción
INSERT INTO dispositivos (id, api_key, nombre, activo)
VALUES ('TABLET-01', 'API_KEY_DEL_DISPOSITIVO', 'Tablet Acceso 01', true)
ON CONFLICT (id) DO NOTHING;

