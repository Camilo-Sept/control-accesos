CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  nombre TEXT NOT NULL,
  no_empleado TEXT,
  empresa TEXT,
  area TEXT,
  bodega TEXT,

  tipo_persona TEXT NOT NULL DEFAULT 'EMPLEADO'
    CHECK (tipo_persona IN ('EMPLEADO', 'VISITANTE', 'PROVEEDOR', 'CONTRATISTA')),

  activo BOOLEAN NOT NULL DEFAULT TRUE,

  qr_value TEXT UNIQUE,

  telefono TEXT,
  email TEXT,
  notas TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_personas_no_empleado
  ON personas (no_empleado)
  WHERE no_empleado IS NOT NULL AND btrim(no_empleado) <> '';

CREATE INDEX IF NOT EXISTS idx_personas_nombre
  ON personas (nombre);

CREATE INDEX IF NOT EXISTS idx_personas_empresa
  ON personas (empresa);

CREATE INDEX IF NOT EXISTS idx_personas_bodega
  ON personas (bodega);

CREATE INDEX IF NOT EXISTS idx_personas_tipo_persona
  ON personas (tipo_persona);

CREATE INDEX IF NOT EXISTS idx_personas_activo
  ON personas (activo);

CREATE INDEX IF NOT EXISTS idx_personas_qr_value
  ON personas (qr_value);

CREATE OR REPLACE FUNCTION set_updated_at_personas()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_personas_updated_at ON personas;

CREATE TRIGGER trg_personas_updated_at
BEFORE UPDATE ON personas
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_personas();
