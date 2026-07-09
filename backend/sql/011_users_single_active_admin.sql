WITH active_admins AS (
  SELECT id, row_number() OVER (ORDER BY created_at ASC, id ASC) AS position
  FROM users
  WHERE role = 'ADMIN' AND activo = true
)
UPDATE users
SET activo = false
WHERE id IN (
  SELECT id
  FROM active_admins
  WHERE position > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_single_active_admin
ON users ((role))
WHERE role = 'ADMIN' AND activo = true;
