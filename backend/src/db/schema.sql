CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS registros (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo text NOT NULL CHECK (tipo IN ('ENTRADA', 'SALIDA')),
  tipo_entidad text NOT NULL CHECK (tipo_entidad IN ('PEATON', 'VEHICULO')),
  categoria text NOT NULL CHECK (categoria IN ('EMPLEADO', 'PROVEEDOR', 'VISITANTE')),
  nombre text,
  no_empleado text,
  empresa text,
  bodega text,
  asunto text,
  placa text,
  modelo text,
  color text,
  qr_contenido text,
  fecha_hora timestamptz NOT NULL,
  dispositivo_id text NOT NULL,
  salida_sin_entrada boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registros_fecha ON registros (fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_registros_bodega_fecha ON registros (bodega, fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_registros_no_empleado ON registros (no_empleado);
CREATE INDEX IF NOT EXISTS idx_registros_placa ON registros (placa);
CREATE INDEX IF NOT EXISTS idx_registros_dispositivo ON registros (dispositivo_id);
