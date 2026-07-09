CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE dispositivos
  ADD COLUMN IF NOT EXISTS api_key_hash text;

UPDATE dispositivos
SET api_key_hash = encode(digest(api_key, 'sha256'), 'hex')
WHERE api_key_hash IS NULL
  AND api_key IS NOT NULL;

ALTER TABLE dispositivos
  ALTER COLUMN api_key_hash SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dispositivos_api_key_hash
  ON dispositivos (api_key_hash);

ALTER TABLE dispositivos
  DROP COLUMN IF EXISTS api_key;
