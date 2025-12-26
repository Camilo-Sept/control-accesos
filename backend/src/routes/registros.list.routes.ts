import { Router } from 'express'
import { z } from 'zod'
import { RegistrosRepo } from '../repos/registros.repo'

const querySchema = z.object({
  tipo: z.enum(['ENTRADA', 'SALIDA']).optional(),
  salidaSinEntrada: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .optional(),
  hoy: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .optional(),
  limit: z
    .string()
    .transform((v) => Math.min(Math.max(parseInt(v || '50', 10) || 50, 1), 200))
    .optional(),
  offset: z
    .string()
    .transform((v) => Math.max(parseInt(v || '0', 10) || 0, 0))
    .optional(),
})

export function registrosListRoutes() {
  const r = Router()
  const repo = new RegistrosRepo()

  // GET /registros?tipo=SALIDA&salidaSinEntrada=true&hoy=1&limit=50&offset=0
  r.get('/registros', async (req, res, next) => {
    try {
      const parsed = querySchema.safeParse(req.query)
      if (!parsed.success) return res.status(400).json({ error: 'Query inválida', details: parsed.error.flatten() })

      const { tipo, salidaSinEntrada, hoy, limit = 50, offset = 0 } = parsed.data

      const data = await repo.list({
        tipo,
        salidaSinEntrada,
        hoy,
        limit,
        offset,
      })

      res.json(data)
    } catch (e) {
      next(e)
    }
  })

  return r
}
