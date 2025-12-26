-- 003_sync_logs.sql
-- Logs de sincronización (batch) desde tablets

CREATE TABLE IF NOT EXISTS sync_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispositivo_id text,                 -- TABLET-01 (si viene en payload o se valida por api_key)
  received_count int NOT NULL DEFAULT 0,
  confirmed_count int NOT NULL DEFAULT 0,
  ip text,
  user_agent text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at
  ON sync_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_logs_dispositivo_created
  ON sync_logs (dispositivo_id, created_at DESC);
