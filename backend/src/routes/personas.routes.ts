import { randomUUID } from 'crypto'
import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { pool } from '../db/pool'
import { HttpError } from '../lib/httpErrors'
import { requireRoles } from '../middlewares/requireRoles'
import { requireKnownDeviceApiKey } from '../middlewares/deviceAuth'

const TIPOS_PERSONA = ['EMPLEADO', 'VISITANTE', 'PROVEEDOR', 'CONTRATISTA'] as const
const PERSONA_QR_PREFIX = 'IMPULSO|2|PERSONA|'

type PgErrorLike = {
  code?: string
  constraint?: string
}

const PERSONA_SELECT_SQL = `
  SELECT
    id,
    nombre,
    no_empleado::text AS "noEmpleado",
    empresa,
    area,
    bodega,
    tipo_persona AS "tipoPersona",
    activo,
    qr_value AS "qrValue",
    telefono,
    email,
    notas,
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM personas
`

function buildCanonicalPersonaQrValue(id: string) {
  return `${PERSONA_QR_PREFIX}${id}`
}

function normalizeUpper(value: string) {
  return value.trim().toUpperCase()
}

function normalizeUpperNullable(value?: string | null) {
  if (value === undefined || value === null) return null
  const normalized = normalizeUpper(value)
  return normalized === '' ? null : normalized
}

function normalizeEmailNullable(value?: string | null) {
  if (value === undefined || value === null) return null
  const normalized = value.trim().toLowerCase()
  return normalized === '' ? null : normalized
}

function normalizePhoneNullable(value?: string | null) {
  if (value === undefined || value === null) return null
  const digits = value.replace(/\D/g, '')
  return digits === '' ? null : digits
}

function parseBooleanLike(value: unknown): boolean | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return undefined

  const s = value.trim().toLowerCase()
  if (s === '1' || s === 'true') return true
  if (s === '0' || s === 'false') return false
  return undefined
}

function normalizeEmployeeNumberInput(
  value: unknown,
  ctx: z.RefinementCtx,
  preserveUndefined: boolean
): string | null | undefined {
  if (value === undefined) {
    return preserveUndefined ? undefined : null
  }

  if (value === null) {
    return null
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'No. empleado inválido. Debe ser un número entero positivo.',
      })
      return z.NEVER
    }

    return String(value)
  }

  if (typeof value === 'bigint') {
    if (value <= 0n) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'No. empleado inválido. Debe ser un número entero positivo.',
      })
      return z.NEVER
    }

    return value.toString()
  }

  if (typeof value === 'string') {
    const normalized = value.trim()

    if (normalized === '') {
      return null
    }

    if (!/^\d+$/.test(normalized)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'No. empleado inválido. Solo se permiten números.',
      })
      return z.NEVER
    }

    try {
      const canonical = BigInt(normalized)

      if (canonical <= 0n) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'No. empleado inválido. Debe ser un número entero positivo.',
        })
        return z.NEVER
      }

      return canonical.toString()
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'No. empleado inválido.',
      })
      return z.NEVER
    }
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: 'No. empleado inválido.',
  })
  return z.NEVER
}

function mapPersonaDbError(error: unknown): HttpError | null {
  const pgError = error as PgErrorLike | undefined

  if (!pgError?.code) {
    return null
  }

  if (pgError.code === '23505') {
    if (pgError.constraint === 'uq_personas_no_empleado') {
      return new HttpError('No. empleado ya existente', 409)
    }

    if (pgError.constraint === 'personas_qr_value_key') {
      return new HttpError('QR ya existente', 409)
    }

    return new HttpError('No. empleado o QR ya existente', 409)
  }

  if (pgError.code === '22P02') {
    return new HttpError('No. empleado inválido. Debe ser numérico.', 400)
  }

  return null
}

const OptionalUpperString = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => normalizeUpperNullable(value))

const OptionalEmailString = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value, ctx) => {
    const normalized = normalizeEmailNullable(value)

    if (normalized === null) return null

    const valid = z.string().email().safeParse(normalized)
    if (!valid.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Email inválido',
      })
      return z.NEVER
    }

    return normalized
  })

const OptionalPhoneString = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value, ctx) => {
    const normalized = normalizePhoneNullable(value)

    if (normalized === null) return null

    if (!/^\d{10}$/.test(normalized)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Teléfono inválido. Debe contener exactamente 10 dígitos.',
      })
      return z.NEVER
    }

    return normalized
  })

const EmployeeNumberCreateSchema = z
  .unknown()
  .optional()
  .nullable()
  .transform((value, ctx) => normalizeEmployeeNumberInput(value, ctx, false))

const EmployeeNumberUpdateSchema = z
  .unknown()
  .optional()
  .nullable()
  .transform((value, ctx) => normalizeEmployeeNumberInput(value, ctx, true))

const PersonaCreateSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'Nombre requerido')
    .transform((value) => normalizeUpper(value)),
  noEmpleado: EmployeeNumberCreateSchema,
  empresa: OptionalUpperString,
  area: OptionalUpperString,
  bodega: OptionalUpperString,
  tipoPersona: z.enum(TIPOS_PERSONA).default('EMPLEADO'),
  activo: z.boolean().optional().default(true),
  telefono: OptionalPhoneString,
  email: OptionalEmailString,
  notas: OptionalUpperString,
})

const PersonaUpdateSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(1, 'Nombre requerido')
      .transform((value) => normalizeUpper(value))
      .optional(),
    noEmpleado: EmployeeNumberUpdateSchema,
    empresa: OptionalUpperString,
    area: OptionalUpperString,
    bodega: OptionalUpperString,
    tipoPersona: z.enum(TIPOS_PERSONA).optional(),
    activo: z.boolean().optional(),
    telefono: OptionalPhoneString,
    email: OptionalEmailString,
    notas: OptionalUpperString,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nada que actualizar',
  })

const QuerySchema = z.object({
  q: z.string().trim().optional(),
  tipoPersona: z.enum(TIPOS_PERSONA).optional(),
  activo: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((value) => parseBooleanLike(value)),
  limit: z
    .string()
    .optional()
    .transform((value) => Math.min(Math.max(parseInt(value || '50', 10) || 50, 1), 200)),
  offset: z
    .string()
    .optional()
    .transform((value) => Math.max(parseInt(value || '0', 10) || 0, 0)),
})

const ByQrQuerySchema = z.object({
  value: z.string().trim().min(1, 'QR requerido'),
  includeInactive: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((value) => parseBooleanLike(value) ?? false),
})

export function personasRoutes() {
  const r = Router()

  r.get('/by-qr', requireKnownDeviceApiKey, async (req, res, next) => {
    try {
      const parsed = ByQrQuerySchema.safeParse(req.query)
      if (!parsed.success) {
        throw new HttpError('Query inválida', 400, parsed.error.flatten())
      }

      const { value, includeInactive } = parsed.data
      const qrValue = value.trim()

      const params: unknown[] = [qrValue]
      let whereExtra = ''

      if (!includeInactive) {
        params.push(true)
        whereExtra = 'AND activo = $2'
      }

      const result = await pool.query(
        `
        ${PERSONA_SELECT_SQL}
        WHERE qr_value = $1
        ${whereExtra}
        LIMIT 1
        `,
        params
      )

      if (!result.rows[0]) {
        throw new HttpError('Persona no encontrada para ese QR', 404)
      }

      res.json(result.rows[0])
    } catch (error) {
      next(error)
    }
  })

  r.use(requireRoles('ADMIN', 'SUP'))

  r.get('/', async (req, res, next) => {
    try {
      const parsed = QuerySchema.safeParse(req.query)
      if (!parsed.success) {
        throw new HttpError('Query inválida', 400, parsed.error.flatten())
      }

      const { q, tipoPersona, activo, limit = 50, offset = 0 } = parsed.data

      const where: string[] = []
      const values: unknown[] = []

      if (q && q.trim()) {
        values.push(`%${q.trim()}%`)
        const idx = values.length

        where.push(`(
          nombre ILIKE $${idx}
          OR COALESCE(no_empleado::text, '') ILIKE $${idx}
          OR COALESCE(empresa, '') ILIKE $${idx}
          OR COALESCE(area, '') ILIKE $${idx}
          OR COALESCE(bodega, '') ILIKE $${idx}
          OR COALESCE(qr_value, '') ILIKE $${idx}
        )`)
      }

      if (tipoPersona) {
        values.push(tipoPersona)
        where.push(`tipo_persona = $${values.length}`)
      }

      if (activo !== undefined) {
        values.push(activo)
        where.push(`activo = $${values.length}`)
      }

      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

      const totalSql = `
        SELECT count(*)::int AS total
        FROM personas
        ${whereSql}
      `
      const totalRes = await pool.query(totalSql, values)
      const total = totalRes.rows[0]?.total ?? 0

      values.push(limit)
      const limitIdx = values.length
      values.push(offset)
      const offsetIdx = values.length

      const itemsSql = `
        ${PERSONA_SELECT_SQL}
        ${whereSql}
        ORDER BY nombre ASC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}
      `
      const itemsRes = await pool.query(itemsSql, values)

      res.json({
        total,
        limit,
        offset,
        items: itemsRes.rows,
      })
    } catch (error) {
      next(error)
    }
  })

  r.get('/catalogos', async (_req, res, next) => {
    try {
      const [empresasRes, areasRes, bodegasRes] = await Promise.all([
        pool.query(`
          SELECT DISTINCT empresa AS value
          FROM personas
          WHERE empresa IS NOT NULL AND btrim(empresa) <> ''
          ORDER BY empresa ASC
        `),
        pool.query(`
          SELECT DISTINCT area AS value
          FROM personas
          WHERE area IS NOT NULL AND btrim(area) <> ''
          ORDER BY area ASC
        `),
        pool.query(`
          SELECT DISTINCT bodega AS value
          FROM personas
          WHERE bodega IS NOT NULL AND btrim(bodega) <> ''
          ORDER BY bodega ASC
        `),
      ])

      res.json({
        empresas: empresasRes.rows.map((row) => row.value),
        areas: areasRes.rows.map((row) => row.value),
        bodegas: bodegasRes.rows.map((row) => row.value),
      })
    } catch (error) {
      next(error)
    }
  })

  r.get('/:id', async (req, res, next) => {
    try {
      const { id } = req.params

      const result = await pool.query(
        `
        ${PERSONA_SELECT_SQL}
        WHERE id = $1
        `,
        [id]
      )

      if (!result.rows[0]) {
        throw new HttpError('Persona no encontrada', 404)
      }

      res.json(result.rows[0])
    } catch (error) {
      next(error)
    }
  })

  r.post('/', async (req, res, next) => {
    try {
      const parsed = PersonaCreateSchema.safeParse(req.body)
      if (!parsed.success) {
        throw new HttpError('Payload inválido', 400, parsed.error.flatten())
      }

      const data = parsed.data
      const personaId = randomUUID()
      const qrValue = buildCanonicalPersonaQrValue(personaId)

      const result = await pool.query(
        `
        INSERT INTO personas (
          id,
          nombre,
          no_empleado,
          empresa,
          area,
          bodega,
          tipo_persona,
          activo,
          qr_value,
          telefono,
          email,
          notas
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING
          id,
          nombre,
          no_empleado::text AS "noEmpleado",
          empresa,
          area,
          bodega,
          tipo_persona AS "tipoPersona",
          activo,
          qr_value AS "qrValue",
          telefono,
          email,
          notas,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        `,
        [
          personaId,
          data.nombre,
          data.noEmpleado,
          data.empresa,
          data.area,
          data.bodega,
          data.tipoPersona,
          data.activo ?? true,
          qrValue,
          data.telefono,
          data.email,
          data.notas,
        ]
      )

      res.status(201).json(result.rows[0])
    } catch (error) {
      const mappedError = mapPersonaDbError(error)
      if (mappedError) {
        return next(mappedError)
      }

      next(error)
    }
  })

  r.put('/:id', async (req, res, next) => {
    try {
      const { id } = req.params

      const parsed = PersonaUpdateSchema.safeParse(req.body)
      if (!parsed.success) {
        const flattened = parsed.error.flatten()
        const formErrors = flattened.formErrors ?? []

        if (formErrors.includes('Nada que actualizar')) {
          throw new HttpError('Nada que actualizar', 400, flattened)
        }

        throw new HttpError('Payload inválido', 400, flattened)
      }

      const data = parsed.data
      const sets: string[] = []
      const values: unknown[] = []

      const pushSet = (sqlKey: string, value: unknown) => {
        values.push(value)
        sets.push(`${sqlKey} = $${values.length}`)
      }

      if (data.nombre !== undefined) pushSet('nombre', data.nombre)
      if (data.noEmpleado !== undefined) pushSet('no_empleado', data.noEmpleado)
      if (data.empresa !== undefined) pushSet('empresa', data.empresa)
      if (data.area !== undefined) pushSet('area', data.area)
      if (data.bodega !== undefined) pushSet('bodega', data.bodega)
      if (data.tipoPersona !== undefined) pushSet('tipo_persona', data.tipoPersona)
      if (data.activo !== undefined) pushSet('activo', data.activo)
      if (data.telefono !== undefined) pushSet('telefono', data.telefono)
      if (data.email !== undefined) pushSet('email', data.email)
      if (data.notas !== undefined) pushSet('notas', data.notas)

      if (!sets.length) {
        throw new HttpError('Nada que actualizar', 400)
      }

      pushSet('qr_value', buildCanonicalPersonaQrValue(id))

      values.push(id)
      const idIdx = values.length

      const result = await pool.query(
        `
        UPDATE personas
        SET ${sets.join(', ')}
        WHERE id = $${idIdx}
        RETURNING
          id,
          nombre,
          no_empleado::text AS "noEmpleado",
          empresa,
          area,
          bodega,
          tipo_persona AS "tipoPersona",
          activo,
          qr_value AS "qrValue",
          telefono,
          email,
          notas,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        `,
        values
      )

      if (!result.rows[0]) {
        throw new HttpError('Persona no encontrada', 404)
      }

      res.json(result.rows[0])
    } catch (error) {
      const mappedError = mapPersonaDbError(error)
      if (mappedError) {
        return next(mappedError)
      }

      next(error)
    }
  })

  r.patch('/:id/activo', async (req, res, next) => {
    try {
      const { id } = req.params
      const activo = req.body?.activo

      if (typeof activo !== 'boolean') {
        throw new HttpError('Campo activo requerido', 400)
      }

      const qrValue = buildCanonicalPersonaQrValue(id)

      const result = await pool.query(
        `
        UPDATE personas
        SET activo = $1,
            qr_value = $2
        WHERE id = $3
        RETURNING
          id,
          nombre,
          no_empleado::text AS "noEmpleado",
          empresa,
          area,
          bodega,
          tipo_persona AS "tipoPersona",
          activo,
          qr_value AS "qrValue",
          telefono,
          email,
          notas,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        `,
        [activo, qrValue, id]
      )

      if (!result.rows[0]) {
        throw new HttpError('Persona no encontrada', 404)
      }

      res.json(result.rows[0])
    } catch (error) {
      next(error)
    }
  })

  return r
}
