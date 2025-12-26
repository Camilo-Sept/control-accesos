import { pool } from '../db/pool'

export type RegistroIn = {
  id?: string
  tipo: 'ENTRADA' | 'SALIDA'
  tipoEntidad: 'PEATON' | 'VEHICULO'
  categoria: 'EMPLEADO' | 'PROVEEDOR' | 'VISITANTE'

  nombre?: string | null
  noEmpleado?: string | null
  empresa?: string | null
  bodega?: string | null
  asunto?: string | null

  placa?: string | null
  modelo?: string | null
  color?: string | null

  qrContenido?: string | null

  fechaHora: string
  dispositivoId: string

  salidaSinEntrada?: boolean
}

export type ListParams = {
  q?: string
  tipo?: 'ENTRADA' | 'SALIDA'
  categoria?: 'EMPLEADO' | 'PROVEEDOR' | 'VISITANTE'
  dispositivoId?: string
  bodega?: string
  salidaSinEntrada?: boolean
  hoy?: boolean
  from?: string // ISO
  to?: string // ISO
  limit: number
  offset: number
}

export class RegistrosRepo {
  async insertBatch(registros: RegistroIn[]): Promise<string[]> {
    const inserted: string[] = []
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      for (const r of registros) {
        const q = `
          INSERT INTO registros (
            id, tipo, tipo_entidad, categoria,
            nombre, no_empleado, empresa, bodega, asunto,
            placa, modelo, color, qr_contenido,
            fecha_hora, dispositivo_id, salida_sin_entrada
          )
          VALUES (
            COALESCE($1::uuid, uuid_generate_v4()),
            $2, $3, $4,
            $5, $6, $7, $8, $9,
            $10, $11, $12, $13,
            $14::timestamptz, $15, $16
          )
          ON CONFLICT (id) DO NOTHING
          RETURNING id
        `
        const vals = [
          r.id ?? null,
          r.tipo,
          r.tipoEntidad,
          r.categoria,
          r.nombre ?? null,
          r.noEmpleado ?? null,
          r.empresa ?? null,
          r.bodega ?? null,
          r.asunto ?? null,
          r.placa ?? null,
          r.modelo ?? null,
          r.color ?? null,
          r.qrContenido ?? null,
          r.fechaHora,
          r.dispositivoId,
          r.salidaSinEntrada ?? false,
        ]
        const res = await client.query(q, vals)
        if (res.rows[0]?.id) inserted.push(res.rows[0].id)
      }

      await client.query('COMMIT')
      return inserted
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  }

  async list(params: ListParams) {
    const where: string[] = []
    const values: any[] = []
    let i = 1

    const add = (sql: string, ...vals: any[]) => {
      where.push(sql)
      for (const v of vals) values.push(v)
    }

    if (params.tipo) add(`tipo = $${i++}`, params.tipo)

    if (params.categoria) add(`categoria = $${i++}`, params.categoria)

    if (params.dispositivoId) add(`dispositivo_id = $${i++}`, params.dispositivoId)

    if (params.bodega) add(`bodega = $${i++}`, params.bodega)

    if (typeof params.salidaSinEntrada === 'boolean') {
      add(`salida_sin_entrada = $${i++}`, params.salidaSinEntrada)
    }

    if (params.hoy) {
      // hoy según reloj del servidor
      where.push(`fecha_hora >= date_trunc('day', now())`)
    }

    if (params.from) add(`fecha_hora >= $${i++}::timestamptz`, params.from)

    if (params.to) add(`fecha_hora <= $${i++}::timestamptz`, params.to)

    if (params.q && params.q.trim().length) {
      const term = `%${params.q.trim()}%`
      // Un solo parámetro para varias columnas (ILIKE)
      add(
        `(
          nombre ILIKE $${i} OR
          no_empleado ILIKE $${i} OR
          empresa ILIKE $${i} OR
          bodega ILIKE $${i} OR
          asunto ILIKE $${i} OR
          placa ILIKE $${i} OR
          dispositivo_id ILIKE $${i} OR
          qr_contenido ILIKE $${i}
        )`,
        term
      )
      i++
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const totalSql = `SELECT count(*)::int as total FROM registros ${whereSql}`
    const totalRes = await pool.query(totalSql, values)
    const total = totalRes.rows[0]?.total ?? 0

    const listSql = `
      SELECT
        id, tipo, tipo_entidad as "tipoEntidad", categoria,
        nombre, no_empleado as "noEmpleado", empresa, bodega, asunto,
        placa, modelo, color,
        qr_contenido as "qrContenido",
        fecha_hora as "fechaHora",
        dispositivo_id as "dispositivoId",
        salida_sin_entrada as "salidaSinEntrada"
      FROM registros
      ${whereSql}
      ORDER BY fecha_hora DESC
      LIMIT $${i++} OFFSET $${i++}
    `
    const listValues = [...values, params.limit, params.offset]
    const listRes = await pool.query(listSql, listValues)

    return {
      total,
      limit: params.limit,
      offset: params.offset,
      items: listRes.rows,
    }
  }
}
