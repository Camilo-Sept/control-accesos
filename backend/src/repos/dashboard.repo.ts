import { pool } from '../db/pool'

export class DashboardRepo {
  async getStats({ bodegaId }: { bodegaId?: string }) {
    const whereBodega = bodegaId ? `AND bodega = $1` : ``
    const values = bodegaId ? [bodegaId] : []

    const q = `
      WITH base AS (
        SELECT
          tipo,
          fecha_hora,
          salida_sin_entrada,
          bodega,
          CASE
            WHEN NULLIF(TRIM(no_empleado), '') IS NOT NULL THEN 'EMP:' || TRIM(no_empleado)
            WHEN NULLIF(TRIM(placa), '') IS NOT NULL THEN 'PLA:' || TRIM(placa)
            ELSE 'PER:' || COALESCE(TRIM(nombre),'') || '|' || COALESCE(TRIM(empresa),'') || '|' || COALESCE(TRIM(bodega),'')
          END AS ident_key
        FROM registros
        WHERE 1=1
        ${whereBodega}
      ),
      today AS (
        SELECT *
        FROM base
        WHERE (fecha_hora AT TIME ZONE 'America/Ciudad_Juarez')::date
           = (NOW()      AT TIME ZONE 'America/Ciudad_Juarez')::date
      ),
      last_by_person AS (
        SELECT DISTINCT ON (ident_key)
          ident_key, tipo, fecha_hora
        FROM base
        ORDER BY ident_key, fecha_hora DESC
      )
      SELECT
        (SELECT COUNT(*) FROM last_by_person WHERE tipo = 'ENTRADA')::int AS dentro,
        (SELECT COUNT(*) FROM today WHERE tipo = 'ENTRADA')::int AS entradas_hoy,
        (SELECT COUNT(*) FROM today WHERE tipo = 'SALIDA')::int AS salidas_hoy,
        (SELECT COUNT(*) FROM today WHERE tipo = 'SALIDA' AND salida_sin_entrada = true)::int AS salidas_sin_entrada_hoy
    `

    const res = await pool.query(q, values)
    const row = res.rows[0] ?? {}

    return {
      dentro: Number(row.dentro ?? 0),
      entradasHoy: Number(row.entradas_hoy ?? 0),
      salidasHoy: Number(row.salidas_hoy ?? 0),
      salidasSinEntradaHoy: Number(row.salidas_sin_entrada_hoy ?? 0),
      tabletsActivas: 0,
      pendientesSync: 0,
      asOf: new Date().toISOString()
    }
  }
}
