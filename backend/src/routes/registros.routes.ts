import { Router } from 'express'
import { z } from 'zod'
import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'
import { RegistrosRepo } from '../repos/registros.repo'
import { HttpError } from '../lib/httpErrors'
import { requireDeviceApiKey } from '../middlewares/deviceAuth'
import { pool } from '../db/pool'

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

  salidaSinEntrada: z.boolean().optional().default(false),
})

const BatchSchema = z.object({
  registros: z.array(RegistroSchema).min(1),
})

// ✅ boolean query param robusto: '1'/'true' => true, '0'/'false' => false, vacío/undefined => undefined
const BoolParam = z
  .union([z.string(), z.boolean()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined
    if (typeof v === 'boolean') return v
    const s = v.trim().toLowerCase()
    if (s === 'true' || s === '1') return true
    if (s === 'false' || s === '0') return false
    return undefined
  })

const IsoParam = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Invalid ISO datetime' })
  .optional()

const querySchema = z.object({
  q: z.string().optional(),

  tipo: z.enum(['ENTRADA', 'SALIDA']).optional(),
  categoria: z.enum(['EMPLEADO', 'PROVEEDOR', 'VISITANTE']).optional(),

  dispositivoId: z.string().min(1).optional(),
  bodega: z.string().min(1).optional(),

  salidaSinEntrada: BoolParam,
  hoy: BoolParam,

  from: IsoParam,
  to: IsoParam,

  limit: z
    .string()
    .transform((v) => Math.min(Math.max(parseInt(v || '50', 10) || 50, 1), 200))
    .optional(),

  offset: z
    .string()
    .transform((v) => Math.max(parseInt(v || '0', 10) || 0, 0))
    .optional(),
})

function parseFilters(reqQuery: any) {
  const parsed = querySchema.safeParse(reqQuery)
  if (!parsed.success) {
    throw new HttpError('Query inválida', 400, parsed.error.flatten())
  }

  return {
    q: parsed.data.q,
    tipo: parsed.data.tipo,
    categoria: parsed.data.categoria,
    dispositivoId: parsed.data.dispositivoId,
    bodega: parsed.data.bodega,
    salidaSinEntrada: parsed.data.salidaSinEntrada,
    hoy: parsed.data.hoy,
    from: parsed.data.from,
    to: parsed.data.to,
    limit: parsed.data.limit ?? 50,
    offset: parsed.data.offset ?? 0,
  }
}

// Helper: registra log de sync (best-effort, nunca rompe el flujo)
async function logSyncBatch(input: {
  dispositivoId: string | null
  receivedCount: number
  confirmedCount: number
  ip: string | null
  userAgent: string | null
  error: string | null
}) {
  try {
    await pool.query(
      `
      INSERT INTO sync_logs (dispositivo_id, received_count, confirmed_count, ip, user_agent, error)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        input.dispositivoId,
        input.receivedCount,
        input.confirmedCount,
        input.ip,
        input.userAgent,
        input.error,
      ]
    )
  } catch {
    // no-op
  }
}

export function registrosRoutes() {
  const r = Router()
  const repo = new RegistrosRepo()

  // POST /registros/batch
  // - protegido SOLO si REQUIRE_DEVICE_AUTH=1 (por middleware)
  // - siempre regresa confirmados
  // - siempre registra log (éxito/fracaso) sin romper nada
  r.post('/batch', requireDeviceApiKey, async (req, res, next) => {
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
      req.socket?.remoteAddress ??
      null
    const userAgent = (req.headers['user-agent'] as string | undefined) ?? null

    let dispositivoId: string | null = null
    let receivedCount = 0

    try {
      const parsed = BatchSchema.safeParse(req.body)
      if (!parsed.success) {
        await logSyncBatch({
          dispositivoId: null,
          receivedCount: 0,
          confirmedCount: 0,
          ip,
          userAgent,
          error: 'Payload inválido (Zod)',
        })
        throw new HttpError('Payload inválido', 400, parsed.error.flatten())
      }

      receivedCount = parsed.data.registros.length
      dispositivoId = parsed.data.registros[0]?.dispositivoId ?? null

      const confirmados = await repo.insertBatch(parsed.data.registros)

      await logSyncBatch({
        dispositivoId,
        receivedCount,
        confirmedCount: confirmados.length,
        ip,
        userAgent,
        error: null,
      })

      res.json({ ok: true, confirmados })
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      await logSyncBatch({
        dispositivoId,
        receivedCount,
        confirmedCount: 0,
        ip,
        userAgent,
        error: msg,
      })
      next(e)
    }
  })

  // GET /registros?... filtros ...
  r.get('/', async (req, res, next) => {
    try {
      const f = parseFilters(req.query)
      const data = await repo.list({ ...f, limit: f.limit, offset: f.offset })
      res.json(data)
    } catch (err) {
      next(err)
    }
  })

  // Export Excel (usa EXACTAMENTE los mismos filtros que /registros)
  r.get('/export.xlsx', async (req, res, next) => {
    try {
      const f = parseFilters(req.query)

      const rows = await repo.listForExport({
        q: f.q,
        tipo: f.tipo,
        categoria: f.categoria,
        dispositivoId: f.dispositivoId,
        bodega: f.bodega,
        salidaSinEntrada: f.salidaSinEntrada,
        hoy: f.hoy,
        from: f.from,
        to: f.to,
      })

      const wb = new ExcelJS.Workbook()
      wb.creator = 'control-accesos'
      wb.created = new Date()

      const ws = wb.addWorksheet('Registros')

      ws.columns = [
        { header: 'Fecha', key: 'fechaHora', width: 24 },
        { header: 'Tipo', key: 'tipo', width: 10 },
        { header: 'Entidad', key: 'tipoEntidad', width: 12 },
        { header: 'Categoría', key: 'categoria', width: 12 },
        { header: 'Nombre', key: 'nombre', width: 24 },
        { header: 'No. Empleado', key: 'noEmpleado', width: 14 },
        { header: 'Empresa', key: 'empresa', width: 18 },
        { header: 'Bodega', key: 'bodega', width: 14 },
        { header: 'Asunto', key: 'asunto', width: 18 },
        { header: 'Placa', key: 'placa', width: 12 },
        { header: 'Dispositivo', key: 'dispositivoId', width: 14 },
        { header: 'Sin entrada', key: 'salidaSinEntrada', width: 12 },
      ]

      ws.getRow(1).font = { bold: true }

      for (const it of rows) {
        ws.addRow({
          fechaHora: it.fechaHora,
          tipo: it.tipo,
          tipoEntidad: it.tipoEntidad,
          categoria: it.categoria,
          nombre: it.nombre ?? '',
          noEmpleado: it.noEmpleado ?? '',
          empresa: it.empresa ?? '',
          bodega: it.bodega ?? '',
          asunto: it.asunto ?? '',
          placa: it.placa ?? '',
          dispositivoId: it.dispositivoId ?? '',
          salidaSinEntrada: it.salidaSinEntrada ? 'SI' : 'NO',
        })
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', 'attachment; filename="registros.xlsx"')

      await wb.xlsx.write(res)
      res.end()
    } catch (err) {
      next(err)
    }
  })

  // Export PDF (simple, listado)
  r.get('/export.pdf', async (req, res, next) => {
    try {
      const f = parseFilters(req.query)

      const rowsAll = await repo.listForExport({
        q: f.q,
        tipo: f.tipo,
        categoria: f.categoria,
        dispositivoId: f.dispositivoId,
        bodega: f.bodega,
        salidaSinEntrada: f.salidaSinEntrada,
        hoy: f.hoy,
        from: f.from,
        to: f.to,
      })

      const rows = rowsAll.slice(0, 1000)

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', 'attachment; filename="registros.pdf"')

      const doc = new PDFDocument({ margin: 36, size: 'A4' })
      doc.pipe(res)

      doc.fontSize(16).text('Registros - Control de accesos', { align: 'left' })
      doc.moveDown(0.5)
      doc.fontSize(10).fillColor('#555').text(`Generado: ${new Date().toLocaleString()}`)
      doc.moveDown()

      doc.fillColor('#000')
      doc.fontSize(11).text(`Total (máx mostrado): ${rows.length}`)
      doc.moveDown()

      doc.fontSize(9)
      for (const it of rows) {
        const line = [
          it.fechaHora,
          it.tipo,
          it.categoria,
          it.nombre ?? '-',
          it.noEmpleado ?? '-',
          it.empresa ?? '-',
          it.bodega ?? '-',
          it.placa ?? '-',
          it.dispositivoId,
          it.salidaSinEntrada ? 'SIN ENTRADA' : '',
        ]
          .filter(Boolean)
          .join(' · ')

        doc.text(line)
        doc.moveDown(0.3)

        if (doc.y > 760) doc.addPage()
      }

      doc.end()
    } catch (err) {
      next(err)
    }
  })

  return r
}
