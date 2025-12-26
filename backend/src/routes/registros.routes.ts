import { Router } from 'express'
import { z } from 'zod'
import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'
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

  salidaSinEntrada: z.boolean().optional().default(false),
})

const BatchSchema = z.object({
  registros: z.array(RegistroSchema).min(1),
})

const BoolParam = z
  .string()
  .transform((v) => v === 'true' || v === '1')
  .optional()

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
    const err = new HttpError('Query inválida', 400, parsed.error.flatten())
    throw err
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

  // GET /registros?... filtros ...
  r.get('/', async (req, res, next) => {
    try {
      const f = parseFilters(req.query)

      const data = await repo.list({
        ...f,
        limit: f.limit,
        offset: f.offset,
      })

      res.json(data)
    } catch (err) {
      next(err)
    }
  })

  // Export Excel
  r.get('/export.xlsx', async (req, res, next) => {
    try {
      const f = parseFilters(req.query)

      // Para export: subimos límite (pero con tope para no tumbar el server)
      const data = await repo.list({
        ...f,
        limit: 5000,
        offset: 0,
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

      for (const it of data.items) {
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

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
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

      const data = await repo.list({
        ...f,
        limit: 1000, // PDF no debe ser infinito
        offset: 0,
      })

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', 'attachment; filename="registros.pdf"')

      const doc = new PDFDocument({ margin: 36, size: 'A4' })
      doc.pipe(res)

      doc.fontSize(16).text('Registros - Control de accesos', { align: 'left' })
      doc.moveDown(0.5)
      doc.fontSize(10).fillColor('#555').text(`Generado: ${new Date().toLocaleString()}`)
      doc.moveDown()

      doc.fillColor('#000')
      doc.fontSize(11).text(`Total (máx mostrado): ${data.items.length}`)
      doc.moveDown()

      doc.fontSize(9)
      for (const it of data.items) {
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
