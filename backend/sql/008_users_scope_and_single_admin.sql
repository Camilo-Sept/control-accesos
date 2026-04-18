CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS bodega text;

UPDATE users
SET
  full_name = COALESCE(NULLIF(BTRIM(full_name), ''), 'Administrador'),
  bodega = COALESCE(NULLIF(BTRIM(bodega), ''), 'GENERAL')
WHERE role = 'ADMIN';

UPDATE users
SET bodega = 'GENERAL'
WHERE bodega IS NULL OR BTRIM(bodega) = '';

ALTER TABLE users
  ALTER COLUMN bodega SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_bodega ON users (bodega);
CREATE INDEX IF NOT EXISTS idx_users_role_bodega ON users (role, bodega);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_single_active_admin
ON users ((role))
WHERE role = 'ADMIN' AND activo = true;