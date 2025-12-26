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
          r.salidaSinEntrada ?? false
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
}
