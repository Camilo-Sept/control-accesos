import { Request, Response, NextFunction } from 'express'
import { pool } from '../db/pool'
import { HttpError } from '../lib/httpErrors'

/**
 * Auth de tablets por API key.
 * Header requerido cuando REQUIRE_DEVICE_AUTH=1:
 *   - x-api-key
 *
 * Comportamiento:
 * - REQUIRE_DEVICE_AUTH != '1' => NO bloquea (modo dev / no rompe)
 * - REQUIRE_DEVICE_AUTH == '1' => valida api_key y que el dispositivo esté activo
 * - Además valida que registros[0].dispositivoId coincida con el dispositivo de esa api_key
 */
export async function requireDeviceApiKey(req: Request, _res: Response, next: NextFunction) {
  try {
    const requireAuth = process.env.REQUIRE_DEVICE_AUTH === '1'
    if (!requireAuth) return next()

    const apiKey = String(req.header('x-api-key') ?? '').trim()
    if (!apiKey) throw new HttpError('Falta header x-api-key', 401)

    const r = await pool.query(
      `SELECT id, activo FROM dispositivos WHERE api_key = $1 LIMIT 1`,
      [apiKey]
    )
    const device = r.rows[0] as { id: string; activo: boolean } | undefined
    if (!device || device.activo !== true) throw new HttpError('Dispositivo no autorizado', 401)

    // best-effort last_seen
    pool.query(`UPDATE dispositivos SET last_seen_at = now() WHERE id = $1`, [device.id]).catch(() => {})

    // Validar que el payload diga el mismo dispositivoId
    const regs = (req.body as any)?.registros
    if (!Array.isArray(regs) || regs.length === 0) {
      throw new HttpError('Payload inválido: falta registros[]', 400)
    }
    const payloadDeviceId = String(regs[0]?.dispositivoId ?? '').trim()
    if (!payloadDeviceId) throw new HttpError('Payload inválido: falta dispositivoId', 400)

    if (payloadDeviceId !== device.id) {
      throw new HttpError('dispositivoId no coincide con API key', 401, {
        expected: device.id,
        got: payloadDeviceId,
      })
    }

    next()
  } catch (e) {
    next(e)
  }
}
