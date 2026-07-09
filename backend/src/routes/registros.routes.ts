import { Router } from 'express'
import { z } from 'zod'
import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'
import { RegistrosRepo } from '../repos/registros.repo'
import { HttpError } from '../lib/httpErrors'
import { requireDeviceApiKey } from '../middlewares/deviceAuth'
import { requireAdminJwt } from '../middlewares/adminAuth'
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
  registros: z.array(RegistroSchema).min(1).max(500),
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
r.get('/', requireAdminJwt, async (req, res, next) => {
    try {
      const f = parseFilters(req.query)
      const data = await repo.list({ ...f, limit: f.limit, offset: f.offset })
      res.json(data)
    } catch (err) {
      next(err)
    }
  })

  // Export Excel (usa EXACTAMENTE los mismos filtros que /registros)
  r.get('/export.xlsx', requireAdminJwt, async (req, res, next) => {
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

      const ws = wb.addWorksheet('Registros', {
        views: [{ state: 'frozen', ySplit: 4 }],
      })

      const filtros: string[] = []
      if (f.q) filtros.push(`Buscar: ${f.q}`)
      if (f.tipo) filtros.push(`Tipo: ${f.tipo}`)
      if (f.categoria) filtros.push(`Categoría: ${f.categoria}`)
      if (f.dispositivoId) filtros.push(`Dispositivo: ${f.dispositivoId}`)
      if (f.bodega) filtros.push(`Bodega: ${f.bodega}`)
      if (f.salidaSinEntrada === true) filtros.push('Solo salida sin entrada')
      if (f.hoy === true) filtros.push('Hoy')
      if (f.from) filtros.push(`Desde: ${f.from}`)
      if (f.to) filtros.push(`Hasta: ${f.to}`)

      ws.mergeCells('A1:L1')
      ws.getCell('A1').value = 'Reporte de registros'
      ws.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF0F172A' } }
      ws.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' }

      ws.mergeCells('A2:L2')
      ws.getCell('A2').value = `Generado: ${new Date().toLocaleString('es-MX')}`
      ws.getCell('A2').font = { size: 10, color: { argb: 'FF475569' } }

      ws.mergeCells('A3:L3')
      ws.getCell('A3').value = filtros.length ? filtros.join(' | ') : 'Sin filtros'
      ws.getCell('A3').font = { size: 10, color: { argb: 'FF334155' } }
      ws.getCell('A3').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' },
      }
      ws.getCell('A3').border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      }

      ws.columns = [
        { header: 'Fecha', key: 'fechaHora', width: 24 },
        { header: 'Tipo', key: 'tipo', width: 10 },
        { header: 'Entidad', key: 'tipoEntidad', width: 12 },
        { header: 'Categoría', key: 'categoria', width: 14 },
        { header: 'Nombre', key: 'nombre', width: 26 },
        { header: 'No. Empleado', key: 'noEmpleado', width: 14 },
        { header: 'Empresa', key: 'empresa', width: 18 },
        { header: 'Bodega', key: 'bodega', width: 16 },
        { header: 'Asunto', key: 'asunto', width: 20 },
        { header: 'Placa', key: 'placa', width: 12 },
        { header: 'Dispositivo', key: 'dispositivoId', width: 14 },
        { header: 'Auditoría', key: 'auditoria', width: 22 },
      ]

      const headerRow = ws.getRow(4)
      headerRow.values = [
        'Fecha',
        'Tipo',
        'Entidad',
        'Categoría',
        'Nombre',
        'No. Empleado',
        'Empresa',
        'Bodega',
        'Asunto',
        'Placa',
        'Dispositivo',
        'Auditoría',
      ]

      headerRow.height = 22
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' },
      }

      headerRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF1D4ED8' } },
          left: { style: 'thin', color: { argb: 'FF1D4ED8' } },
          bottom: { style: 'thin', color: { argb: 'FF1D4ED8' } },
          right: { style: 'thin', color: { argb: 'FF1D4ED8' } },
        }
      })

      for (const it of rows) {
        const row = ws.addRow({
          fechaHora: new Date(it.fechaHora).toLocaleString('es-MX'),
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
          auditoria: it.salidaSinEntrada ? 'SALIDA SIN ENTRADA' : '',
        })

        row.height = 20

        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'left' }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          }
        })

        if (it.salidaSinEntrada) {
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFEF2F2' },
            }
          })
          row.getCell(12).font = { bold: true, color: { argb: 'FFB91C1C' } }
        }
      }

      ws.autoFilter = {
        from: 'A4',
        to: 'L4',
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', 'attachment; filename="registros.xlsx"')

      await wb.xlsx.write(res)
      res.end()
    } catch (err) {
      next(err)
    }
  })

  // Export PDF (formato bonito para historial)
  r.get('/export.pdf', requireAdminJwt, async (req, res, next) => {
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

      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 36,
      })

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', 'attachment; filename="registros.pdf"')

      doc.pipe(res)

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right
      const startX = doc.page.margins.left
      let y = doc.page.margins.top

      const colFecha = 110
      const colTipo = 60
      const colCategoria = 80
      const colNombre = 160
      const colBodega = 90
      const colPlaca = 80
      const colDispositivo = 85
      const colAuditoria = 120

      const rowHeight = 22
      const headerHeight = 24

      function fmt(v?: string | null) {
        return v ?? '-'
      }

      function fmtDate(v: string) {
        try {
          return new Date(v).toLocaleString('es-MX')
        } catch {
          return v
        }
      }

      function drawTitle() {
        doc.font('Helvetica-Bold').fontSize(18).fillColor('#0f172a')
        doc.text('Reporte de registros', startX, y)

        y += 24

        doc.font('Helvetica').fontSize(9).fillColor('#475569')
        doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, startX, y)

        y += 14

        const filtros: string[] = []
        if (f.q) filtros.push(`Buscar: ${f.q}`)
        if (f.tipo) filtros.push(`Tipo: ${f.tipo}`)
        if (f.categoria) filtros.push(`Categoría: ${f.categoria}`)
        if (f.dispositivoId) filtros.push(`Dispositivo: ${f.dispositivoId}`)
        if (f.bodega) filtros.push(`Bodega: ${f.bodega}`)
        if (f.salidaSinEntrada === true) filtros.push('Solo salida sin entrada')
        if (f.hoy === true) filtros.push('Hoy')
        if (f.from) filtros.push(`Desde: ${f.from}`)
        if (f.to) filtros.push(`Hasta: ${f.to}`)

        doc.roundedRect(startX, y, pageWidth, 34, 6).fillAndStroke('#f8fafc', '#e2e8f0')

        doc.font('Helvetica').fontSize(9).fillColor('#334155')
        doc.text(
          filtros.length ? filtros.join('   |   ') : 'Sin filtros',
          startX + 10,
          y + 11,
          { width: pageWidth - 20 }
        )

        y += 44

        doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a')
        doc.text(`Total de registros: ${rows.length}`, startX, y)

        y += 16
      }

      function drawHeader() {
        doc.roundedRect(startX, y, pageWidth, headerHeight, 4).fill('#1d4ed8')

        doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff')

        let x = startX + 6
        doc.text('Fecha', x, y + 7, { width: colFecha - 8 })
        x += colFecha

        doc.text('Tipo', x, y + 7, { width: colTipo - 8 })
        x += colTipo

        doc.text('Categoría', x, y + 7, { width: colCategoria - 8 })
        x += colCategoria

        doc.text('Nombre', x, y + 7, { width: colNombre - 8 })
        x += colNombre

        doc.text('Bodega', x, y + 7, { width: colBodega - 8 })
        x += colBodega

        doc.text('Placa', x, y + 7, { width: colPlaca - 8 })
        x += colPlaca

        doc.text('Dispositivo', x, y + 7, { width: colDispositivo - 8 })
        x += colDispositivo

        doc.text('Auditoría', x, y + 7, { width: colAuditoria - 8 })

        y += headerHeight
      }

      function drawRow(
        row: {
          fechaHora: string
          tipo: string
          categoria: string
          nombre: string | null
          bodega: string | null
          placa: string | null
          dispositivoId: string
          salidaSinEntrada: boolean
        },
        index: number
      ) {
        const isAnomalia = row.salidaSinEntrada === true
        const bg = isAnomalia ? '#fef2f2' : index % 2 === 0 ? '#ffffff' : '#f8fafc'

        doc.rect(startX, y, pageWidth, rowHeight).fillAndStroke(bg, '#e2e8f0')

        doc.fillColor('#0f172a').font('Helvetica').fontSize(8.5)

        let x = startX + 6
        doc.text(fmtDate(row.fechaHora), x, y + 7, { width: colFecha - 8, ellipsis: true })
        x += colFecha

        doc.text(row.tipo, x, y + 7, { width: colTipo - 8, ellipsis: true })
        x += colTipo

        doc.text(row.categoria, x, y + 7, { width: colCategoria - 8, ellipsis: true })
        x += colCategoria

        doc.text(fmt(row.nombre), x, y + 7, { width: colNombre - 8, ellipsis: true })
        x += colNombre

        doc.text(fmt(row.bodega), x, y + 7, { width: colBodega - 8, ellipsis: true })
        x += colBodega

        doc.text(fmt(row.placa), x, y + 7, { width: colPlaca - 8, ellipsis: true })
        x += colPlaca

        doc.text(fmt(row.dispositivoId), x, y + 7, { width: colDispositivo - 8, ellipsis: true })
        x += colDispositivo

        if (isAnomalia) {
          doc.fillColor('#b91c1c').font('Helvetica-Bold')
          doc.text('SALIDA SIN ENTRADA', x, y + 7, {
            width: colAuditoria - 8,
            ellipsis: true,
          })
        } else {
          doc.fillColor('#94a3b8').font('Helvetica')
          doc.text('-', x, y + 7, { width: colAuditoria - 8 })
        }

        y += rowHeight
      }

      function ensureSpace(nextHeight: number) {
        const bottomLimit = doc.page.height - doc.page.margins.bottom
        if (y + nextHeight > bottomLimit) {
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 36 })
          y = doc.page.margins.top
          drawTitle()
          drawHeader()
        }
      }

      drawTitle()
      drawHeader()

      rows.forEach((row, index) => {
        ensureSpace(rowHeight)
        drawRow(
          {
            fechaHora: row.fechaHora,
            tipo: row.tipo,
            categoria: row.categoria,
            nombre: row.nombre,
            bodega: row.bodega,
            placa: row.placa,
            dispositivoId: row.dispositivoId,
            salidaSinEntrada: row.salidaSinEntrada,
          },
          index
        )
      })

      if (rows.length === 0) {
        ensureSpace(40)
        doc.font('Helvetica').fontSize(11).fillColor('#64748b')
        doc.text('No hay registros con los filtros actuales.', startX, y + 12)
      }

      doc.end()
    } catch (err) {
      next(err)
    }
  })
  
  return r
}
