import { Router } from 'express'
import { pool } from '../db/pool'

const TZ_DEFAULT = 'America/Ciudad_Juarez' // Juárez/El Paso

function todayRangeSql(paramIndex: number) {
  return `
    fecha_hora >= (date_trunc('day', now() AT TIME ZONE $${paramIndex}) AT TIME ZONE $${paramIndex})
    AND
    fecha_hora <  ((date_trunc('day', now() AT TIME ZONE $${paramIndex}) + interval '1 day') AT TIME ZONE $${paramIndex})
  `
}

/**
 * IdentityKey estricta y consistente:
 * - VEHICULO por placa
 * - EMPLEADO por no_empleado (solo categoria EMPLEADO)
 * - QR por qr_contenido
 * - Si no hay identidad => NULL
 */
const IDENTITY_KEY_SQL = `
  CASE
    WHEN placa IS NOT NULL AND btrim(placa) <> '' THEN 'P:' || upper(btrim(placa))
    WHEN categoria = 'EMPLEADO' AND no_empleado IS NOT NULL AND btrim(no_empleado) <> '' THEN 'E:' || btrim(no_empleado)
    WHEN qr_contenido IS NOT NULL AND btrim(qr_contenido) <> '' THEN 'Q:' || btrim(qr_contenido)
    ELSE NULL
  END
`

function clampInt(v: any, def: number, min: number, max: number) {
  const n = Number.parseInt(String(v ?? ''), 10)
  if (!Number.isFinite(n)) return def
  return Math.min(Math.max(n, min), max)
}

function parseBool(v: any): boolean {
  const s = String(v ?? '').trim().toLowerCase()
  return s === '1' || s === 'true' || s === 'yes'
}

export function dashboardRoutes() {
  const r = Router()

  // GET /dashboard/stats
  r.get('/stats', async (req, res, next) => {
    try {
      const dentroSql = `
        WITH base AS (
          SELECT
            ${IDENTITY_KEY_SQL} AS identity_key,
            tipo,
            fecha_hora
          FROM registros
        ),
        last_per_identity AS (
          SELECT DISTINCT ON (identity_key)
            identity_key,
            tipo,
            fecha_hora
          FROM base
          WHERE identity_key IS NOT NULL
          ORDER BY identity_key, fecha_hora DESC
        )
        SELECT count(*)::int AS dentro
        FROM last_per_identity
        WHERE tipo = 'ENTRADA'
      `
      const dentroRes = await pool.query(dentroSql)
      const dentro = dentroRes.rows[0]?.dentro ?? 0

      const entradasHoySql = `
        SELECT count(*)::int AS entradas_hoy
        FROM registros
        WHERE tipo = 'ENTRADA'
          AND ${todayRangeSql(1)}
      `
      const salidasHoySql = `
        SELECT count(*)::int AS salidas_hoy
        FROM registros
        WHERE tipo = 'SALIDA'
          AND ${todayRangeSql(1)}
      `
      const sinEntradaHoySql = `
        SELECT count(*)::int AS sin_entrada_hoy
        FROM registros
        WHERE tipo = 'SALIDA'
          AND salida_sin_entrada = true
          AND ${todayRangeSql(1)}
      `

      const [entradasHoyRes, salidasHoyRes, sinEntradaHoyRes] = await Promise.all([
        pool.query(entradasHoySql, [TZ_DEFAULT]),
        pool.query(salidasHoySql, [TZ_DEFAULT]),
        pool.query(sinEntradaHoySql, [TZ_DEFAULT]),
      ])

      const entradasHoy = entradasHoyRes.rows[0]?.entradas_hoy ?? 0
      const salidasHoy = salidasHoyRes.rows[0]?.salidas_hoy ?? 0
      const salidasSinEntradaHoy = sinEntradaHoyRes.rows[0]?.sin_entrada_hoy ?? 0

      const tabletsActivasSql = `
        SELECT count(*)::int AS tablets_activas
        FROM (
          SELECT DISTINCT dispositivo_id
          FROM registros
          WHERE fecha_hora >= now() - interval '15 minutes'
        ) t
      `
      const tabletsActivasRes = await pool.query(tabletsActivasSql)
      const tabletsActivas = tabletsActivasRes.rows[0]?.tablets_activas ?? 0

      const pendientesSync = 0

      res.json({
        dentro,
        entradasHoy,
        salidasHoy,
        salidasSinEntradaHoy,
        tabletsActivas,
        pendientesSync,
      })
    } catch (e) {
      next(e)
    }
  })

  // GET /dashboard/dentro?limit&offset
  r.get('/dentro', async (req, res, next) => {
    try {
      const limit = clampInt(req.query.limit, 200, 1, 1000)
      const offset = clampInt(req.query.offset, 0, 0, 1_000_000)

      const totalSql = `
        WITH base AS (
          SELECT
            ${IDENTITY_KEY_SQL} AS identity_key,
            tipo,
            fecha_hora,
            nombre,
            no_empleado,
            placa,
            qr_contenido,
            bodega,
            dispositivo_id
          FROM registros
        ),
        last_per_identity AS (
          SELECT DISTINCT ON (identity_key)
            identity_key,
            tipo,
            fecha_hora,
            nombre,
            no_empleado,
            placa,
            qr_contenido,
            bodega,
            dispositivo_id
          FROM base
          WHERE identity_key IS NOT NULL
          ORDER BY identity_key, fecha_hora DESC
        )
        SELECT count(*)::int AS total
        FROM last_per_identity
        WHERE tipo = 'ENTRADA'
      `
      const totalRes = await pool.query(totalSql)
      const total = totalRes.rows[0]?.total ?? 0

      const itemsSql = `
        WITH base AS (
          SELECT
            ${IDENTITY_KEY_SQL} AS identity_key,
            tipo,
            fecha_hora,
            nombre,
            no_empleado,
            placa,
            qr_contenido,
            bodega,
            dispositivo_id
          FROM registros
        ),
        last_per_identity AS (
          SELECT DISTINCT ON (identity_key)
            identity_key,
            tipo,
            fecha_hora,
            nombre,
            no_empleado,
            placa,
            qr_contenido,
            bodega,
            dispositivo_id
          FROM base
          WHERE identity_key IS NOT NULL
          ORDER BY identity_key, fecha_hora DESC
        )
        SELECT
          identity_key as "identityKey",
          fecha_hora as "fechaHora",
          nombre,
          no_empleado as "noEmpleado",
          placa,
          qr_contenido as "qrContenido",
          bodega,
          dispositivo_id as "dispositivoId"
        FROM last_per_identity
        WHERE tipo = 'ENTRADA'
        ORDER BY fecha_hora DESC
        LIMIT $1 OFFSET $2
      `
      const itemsRes = await pool.query(itemsSql, [limit, offset])

      res.json({
        total,
        limit,
        offset,
        items: itemsRes.rows,
      })
    } catch (e) {
      next(e)
    }
  })

  /**
   * ✅ GET /dashboard/anomalias?limit=200&offset=0
   * Lista de SALIDAS con salida_sin_entrada=true (auditoría).
   */
  r.get('/anomalias', async (req, res, next) => {
    try {
      const limit = clampInt(req.query.limit, 200, 1, 1000)
      const offset = clampInt(req.query.offset, 0, 0, 1_000_000)

      const totalSql = `
        SELECT count(*)::int AS total
        FROM registros
        WHERE tipo = 'SALIDA'
          AND salida_sin_entrada = true
      `
      const totalRes = await pool.query(totalSql)
      const total = totalRes.rows[0]?.total ?? 0

      const itemsSql = `
        SELECT
          id,
          ${IDENTITY_KEY_SQL} as "identityKey",
          fecha_hora as "fechaHora",
          tipo,
          tipo_entidad as "tipoEntidad",
          categoria,
          nombre,
          no_empleado as "noEmpleado",
          placa,
          qr_contenido as "qrContenido",
          empresa,
          bodega,
          asunto,
          dispositivo_id as "dispositivoId",
          salida_sin_entrada as "salidaSinEntrada"
        FROM registros
        WHERE tipo = 'SALIDA'
          AND salida_sin_entrada = true
        ORDER BY fecha_hora DESC
        LIMIT $1 OFFSET $2
      `
      const itemsRes = await pool.query(itemsSql, [limit, offset])

      res.json({
        total,
        limit,
        offset,
        items: itemsRes.rows,
      })
    } catch (e) {
      next(e)
    }
  })

  /**
   * ✅ GET /dashboard/sync-logs?limit=50&offset=0&dispositivoId=TABLET-01&soloErrores=1
   * Logs de sincronización (audit trail). Esto te salva la vida en producción.
   */
  r.get('/sync-logs', async (req, res, next) => {
    try {
      const limit = clampInt(req.query.limit, 50, 1, 200)
      const offset = clampInt(req.query.offset, 0, 0, 1_000_000)

      const dispositivoIdRaw = String(req.query.dispositivoId ?? '').trim()
      const dispositivoId = dispositivoIdRaw.length ? dispositivoIdRaw : undefined

      const soloErrores = parseBool(req.query.soloErrores)

      const where: string[] = []
      const values: any[] = []
      let i = 1

      if (dispositivoId) {
        where.push(`dispositivo_id = $${i++}`)
        values.push(dispositivoId)
      }

      if (soloErrores) {
        where.push(`error IS NOT NULL AND btrim(error) <> ''`)
      }

      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

      const totalRes = await pool.query(
        `SELECT count(*)::int AS total FROM sync_logs ${whereSql}`,
        values
      )
      const total = totalRes.rows[0]?.total ?? 0

      const rowsRes = await pool.query(
        `
        SELECT
          id,
          dispositivo_id AS "dispositivoId",
          received_count AS "receivedCount",
          confirmed_count AS "confirmedCount",
          ip,
          user_agent AS "userAgent",
          error,
          created_at AS "createdAt"
        FROM sync_logs
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT $${i++} OFFSET $${i++}
        `,
        [...values, limit, offset]
      )

      res.json({
        total,
        limit,
        offset,
        items: rowsRes.rows,
      })
    } catch (e) {
      next(e)
    }
  })

  return r
}
