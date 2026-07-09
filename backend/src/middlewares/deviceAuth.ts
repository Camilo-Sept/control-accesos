import { Request, Response, NextFunction } from 'express'
import { createHash } from 'crypto'
import { pool } from '../db/pool'
import { HttpError } from '../lib/httpErrors'
import { env } from '../lib/env'

declare global {
  namespace Express {
    interface Request {
      accessDevice?: { id: string }
    }
  }
}

function hashApiKey(apiKey: string) {
  return createHash('sha256').update(apiKey).digest('hex')
}

async function authenticateDevice(req: Request) {
  if (!env.requireDeviceAuth) {
    if (env.nodeEnv === 'production') {
      throw new HttpError('Autenticación de dispositivo requerida en producción', 503)
    }
    return { id: env.tabletDeviceId }
  }

  const apiKey = String(req.header('x-api-key') ?? '').trim()
  if (!apiKey) throw new HttpError('Falta header x-api-key', 401)

  const result = await pool.query(
    `SELECT id, activo FROM dispositivos WHERE api_key_hash = $1 LIMIT 1`,
    [hashApiKey(apiKey)]
  )
  const device = result.rows[0] as { id: string; activo: boolean } | undefined
  if (!device || device.activo !== true) throw new HttpError('Dispositivo no autorizado', 401)

  req.accessDevice = { id: device.id }
  pool.query(`UPDATE dispositivos SET last_seen_at = now() WHERE id = $1`, [device.id]).catch(() => {})
  return device
}

export async function requireKnownDeviceApiKey(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    await authenticateDevice(req)
    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Auth de tablets por API key.
 * Header requerido cuando REQUIRE_DEVICE_AUTH=1:
 *   - x-api-key
 *
 * Comportamiento:
 * - REQUIRE_DEVICE_AUTH=1 por defecto y obligatorio en producción.
 * - REQUIRE_DEVICE_AUTH=0 sólo permite desactivarlo explícitamente en desarrollo.
 * - Además valida que registros[0].dispositivoId coincida con el dispositivo de esa api_key
 */
export async function requireDeviceApiKey(req: Request, _res: Response, next: NextFunction) {
  try {
    const device = await authenticateDevice(req)

    // Validar que el payload diga el mismo dispositivoId
    const regs = (req.body as any)?.registros
    if (!Array.isArray(regs) || regs.length === 0) {
      throw new HttpError('Payload inválido: falta registros[]', 400)
    }
    const mismatched = regs.find(
      (registro: { dispositivoId?: unknown }) =>
        String(registro?.dispositivoId ?? '').trim() !== device.id
    )

    if (mismatched) {
      throw new HttpError('dispositivoId no coincide con API key', 401, {
        expected: device.id,
        got: String(mismatched?.dispositivoId ?? ''),
      })
    }

    next()
  } catch (e) {
    next(e)
  }
}
