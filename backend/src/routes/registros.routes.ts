import { Router } from 'express'
import { z } from 'zod'
import { RegistrosRepo } from '../repos/registros.repo'
import { HttpError } from '../lib/httpErrors'

const RegistroSchema = z.object({
  id: z.string().uuid().optional(),

  tipo: z.enum(['ENTRADA', 'SALIDA']),
  tipoEntidad: z.enum(['PEATON', 'VEHICULO']),
  categoria: z.enum(['EMPLEADO', 'PROVEEDOR', 'VISITANTE']),

  nombre: z.string().optional().nullable(),
  noEmpleado: z.string().optional().nullable(),
  empresa: z.string().optional().nullable(),
  bodega: z.string().optional().nullable(),
  asunto: z.string().optional().nullable(),

  placa: z.string().optional().nullable(),
  modelo: z.string().optional().nullable(),
  color: z.string().optional().nullable(),

  qrContenido: z.string().optional().nullable(),

  fechaHora: z.string().refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Invalid ISO datetime' }),
  dispositivoId: z.string().min(1),

  salidaSinEntrada: z.boolean().optional().default(false)
})

const BatchSchema = z.object({
  registros: z.array(RegistroSchema).min(1)
})

export function registrosRoutes() {
  const r = Router()
  const repo = new RegistrosRepo()

  r.post('/batch', async (req, res, next) => {
    try {
      const parsed = BatchSchema.safeParse(req.body)
      if (!parsed.success) throw new HttpError('Payload inválido', 400, parsed.error.flatten())

      const insertedIds = await repo.insertBatch(parsed.data.registros)
      res.json({ ok: true, insertedIds })
    } catch (e) {
      next(e)
    }
  })

  return r
}
