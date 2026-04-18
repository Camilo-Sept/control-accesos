BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'personas'
      AND column_name = 'no_empleado'
  ) THEN
    RAISE EXCEPTION 'La tabla public.personas no tiene la columna no_empleado';
  END IF;
END
$$;

UPDATE personas
SET no_empleado = NULL
WHERE no_empleado IS NOT NULL
  AND BTRIM(no_empleado) = '';

UPDATE personas
SET no_empleado = BTRIM(no_empleado)
WHERE no_empleado IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM personas
    WHERE no_empleado IS NOT NULL
      AND no_empleado !~ '^[0-9]+$'
  ) THEN
    RAISE EXCEPTION 'Hay valores no numericos en personas.no_empleado. Corrigelos antes de ejecutar esta migracion.';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT CAST(no_empleado AS BIGINT) AS no_empleado_normalizado, COUNT(*) AS total
      FROM personas
      WHERE no_empleado IS NOT NULL
      GROUP BY CAST(no_empleado AS BIGINT)
      HAVING COUNT(*) > 1
    ) duplicados
  ) THEN
    RAISE EXCEPTION 'Hay numeros de empleado duplicados en personas. Corrigelos antes de ejecutar esta migracion.';
  END IF;
END
$$;

DROP INDEX IF EXISTS uq_personas_no_empleado;
DROP INDEX IF EXISTS idx_personas_no_empleado;

ALTER TABLE personas
ALTER COLUMN no_empleado TYPE BIGINT
USING no_empleado::BIGINT;

CREATE UNIQUE INDEX uq_personas_no_empleado
ON personas (no_empleado)
WHERE no_empleado IS NOT NULL;

COMMIT;