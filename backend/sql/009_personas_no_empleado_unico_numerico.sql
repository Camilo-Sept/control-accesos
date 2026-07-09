BEGIN;

DO $$
DECLARE
  column_type text;
BEGIN
  SELECT data_type
  INTO column_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'personas'
    AND column_name = 'no_empleado';

  IF column_type IS NULL THEN
    RAISE EXCEPTION 'La tabla public.personas no tiene la columna no_empleado';
  END IF;

  IF column_type <> 'bigint' THEN
    UPDATE personas
    SET no_empleado = NULL
    WHERE no_empleado IS NOT NULL
      AND BTRIM(no_empleado::text) = '';

    UPDATE personas
    SET no_empleado = BTRIM(no_empleado::text)
    WHERE no_empleado IS NOT NULL;

    UPDATE personas
    SET
      notas = CONCAT_WS(
        E'\n',
        NULLIF(BTRIM(notas), ''),
        '[Migración] No. empleado anterior: ' || no_empleado::text
      ),
      no_empleado = NULL
    WHERE no_empleado IS NOT NULL
      AND no_empleado::text !~ '^[0-9]+$';

    IF EXISTS (
      SELECT 1
      FROM (
        SELECT CAST(no_empleado AS BIGINT) AS normalized_employee_number, COUNT(*) AS total
        FROM personas
        WHERE no_empleado IS NOT NULL
        GROUP BY CAST(no_empleado AS BIGINT)
        HAVING COUNT(*) > 1
      ) duplicates
    ) THEN
      RAISE EXCEPTION 'Hay números de empleado duplicados en personas. Corrígelos antes de ejecutar esta migración.';
    END IF;

    DROP INDEX IF EXISTS uq_personas_no_empleado;
    DROP INDEX IF EXISTS idx_personas_no_empleado;

    ALTER TABLE personas
    ALTER COLUMN no_empleado TYPE BIGINT
    USING no_empleado::BIGINT;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_personas_no_empleado
ON personas (no_empleado)
WHERE no_empleado IS NOT NULL;

COMMIT;
