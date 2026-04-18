import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { pool } from '../db/pool'
import { HttpError } from '../lib/httpErrors'
import { requireRoles } from '../middlewares/requireRoles'

type DbUser = {
  id: string
  email: string
  full_name: string
  role: 'ADMIN' | 'SUP' | 'GUARD'
  bodega: string
  activo: boolean
  created_at: string
  updated_at: string
}

const PASSWORD_MIN_LENGTH = 8
const PASSWORD_UPPERCASE_REGEX = /[A-Z]/
const PASSWORD_SPECIAL_REGEX = /[^A-Za-z0-9]/

const ListUsersQuerySchema = z.object({
  q: z.string().optional(),
  role: z.enum(['ADMIN', 'SUP', 'GUARD']).optional(),
  bodega: z.string().optional(),
  activo: z.enum(['true', 'false']).optional(),
})

const PasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  .refine((value) => PASSWORD_UPPERCASE_REGEX.test(value), {
    message: 'La contraseña debe incluir al menos una mayúscula.',
  })
  .refine((value) => PASSWORD_SPECIAL_REGEX.test(value), {
    message: 'La contraseña debe incluir al menos un carácter especial.',
  })

const CreateUserSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: PasswordSchema,
  fullName: z.string().min(3, 'Nombre requerido').max(120),
  role: z.enum(['ADMIN', 'SUP', 'GUARD']),
  bodega: z.string().min(2, 'Bodega requerida').max(80),
})

const UpdateUserSchema = z
  .object({
    email: z.string().email('Correo inválido').optional(),
    password: PasswordSchema.optional(),
    fullName: z.string().min(3, 'Nombre requerido').max(120).optional(),
    role: z.enum(['ADMIN', 'SUP', 'GUARD']).optional(),
    bodega: z.string().min(2, 'Bodega requerida').max(80).optional(),
    activo: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Debes enviar al menos un campo a actualizar',
  })

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeFullName(value: string) {
  return normalizeText(value).toUpperCase()
}

function normalizeEmail(value: string) {
  return normalizeText(value).toLowerCase()
}

function normalizeBodega(value: string) {
  return normalizeText(value).toUpperCase()
}

async function getCurrentUser(userId: string) {
  const result = await pool.query<DbUser>(
    `
    SELECT id, email, full_name, role, bodega, activo, created_at, updated_at
    FROM users
    WHERE id = $1
    LIMIT 1
    `,
    [userId]
  )

  const user = result.rows[0]
  if (!user || !user.activo) throw new HttpError('No autorizado', 401)
  return user
}

async function getTargetUser(userId: string) {
  const result = await pool.query<DbUser>(
    `
    SELECT id, email, full_name, role, bodega, activo, created_at, updated_at
    FROM users
    WHERE id = $1
    LIMIT 1
    `,
    [userId]
  )

  const user = result.rows[0]
  if (!user) throw new HttpError('Usuario no encontrado', 404)
  return user
}

function assertCanSeeUsers(actor: DbUser) {
  if (actor.role !== 'ADMIN' && actor.role !== 'SUP') {
    throw new HttpError('Prohibido', 403)
  }
}

function assertCanCreateRole(actor: DbUser, role: 'ADMIN' | 'SUP' | 'GUARD') {
  if (actor.role === 'ADMIN') {
    return
  }

  if (actor.role === 'SUP') {
    if (role === 'ADMIN') {
      throw new HttpError('Supervisor no puede crear administradores', 403)
    }
    return
  }

  throw new HttpError('Prohibido', 403)
}

function assertCanManageTarget(actor: DbUser, target: DbUser) {
  if (actor.role === 'ADMIN') {
    return
  }

  if (actor.role === 'SUP') {
    if (target.role === 'ADMIN') {
      throw new HttpError('Supervisor no puede administrar administradores', 403)
    }
    return
  }

  throw new HttpError('Prohibido', 403)
}

export function usersRoutes() {
  const router = Router()

  router.get('/users', requireRoles('ADMIN', 'SUP'), async (req, res, next) => {
    try {
      const actor = await getCurrentUser(String(req.authUser?.sub))
      assertCanSeeUsers(actor)

      const parsed = ListUsersQuerySchema.safeParse(req.query)
      if (!parsed.success) {
        throw new HttpError('Query inválida', 400, parsed.error.flatten())
      }

      const filters = parsed.data
      const where: string[] = []
      const values: unknown[] = []

      if (filters.role) {
        values.push(filters.role)
        where.push(`role = $${values.length}`)
      }

      if (filters.bodega?.trim()) {
        values.push(normalizeBodega(filters.bodega))
        where.push(`bodega = $${values.length}`)
      }

      if (filters.activo) {
        values.push(filters.activo === 'true')
        where.push(`activo = $${values.length}`)
      }

      if (filters.q?.trim()) {
        values.push(`%${normalizeText(filters.q)}%`)
        where.push(`(
          full_name ILIKE $${values.length}
          OR email ILIKE $${values.length}
          OR bodega ILIKE $${values.length}
        )`)
      }

      const sql = `
        SELECT
          id,
          email,
          full_name AS "fullName",
          role,
          bodega,
          activo,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM users
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY
          CASE role
            WHEN 'ADMIN' THEN 1
            WHEN 'SUP' THEN 2
            ELSE 3
          END,
          bodega ASC,
          full_name ASC
      `

      const result = await pool.query(sql, values)

      res.json({
        ok: true,
        items: result.rows,
      })
    } catch (error) {
      next(error)
    }
  })

  router.post('/users', requireRoles('ADMIN', 'SUP'), async (req, res, next) => {
    try {
      const actor = await getCurrentUser(String(req.authUser?.sub))
      assertCanSeeUsers(actor)

      const parsed = CreateUserSchema.safeParse(req.body)
      if (!parsed.success) {
        throw new HttpError('Payload inválido', 400, parsed.error.flatten())
      }

      const email = normalizeEmail(parsed.data.email)
      const password = parsed.data.password
      const fullName = normalizeFullName(parsed.data.fullName)
      const role = parsed.data.role
      const bodega = normalizeBodega(parsed.data.bodega)

      assertCanCreateRole(actor, role)

      const passwordHash = await bcrypt.hash(password, 10)

      const result = await pool.query(
        `
        INSERT INTO users (email, password_hash, full_name, role, bodega, activo)
        VALUES ($1, $2, $3, $4, $5, true)
        RETURNING
          id,
          email,
          full_name AS "fullName",
          role,
          bodega,
          activo,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        `,
        [email, passwordHash, fullName, role, bodega]
      )

      res.status(201).json({
        ok: true,
        item: result.rows[0],
      })
    } catch (error: any) {
      if (error?.code === '23505') {
        return next(new HttpError('Ya existe un usuario con ese correo', 409))
      }

      return next(error)
    }
  })

  router.patch('/users/:id', requireRoles('ADMIN', 'SUP'), async (req, res, next) => {
    try {
      const actor = await getCurrentUser(String(req.authUser?.sub))
      assertCanSeeUsers(actor)

      const target = await getTargetUser(req.params.id)
      assertCanManageTarget(actor, target)

      const parsed = UpdateUserSchema.safeParse(req.body)
      if (!parsed.success) {
        throw new HttpError('Payload inválido', 400, parsed.error.flatten())
      }

      const data = parsed.data

      const nextEmail = data.email ? normalizeEmail(data.email) : target.email
      const nextFullName = data.fullName ? normalizeFullName(data.fullName) : target.full_name
      const nextRole = data.role ?? target.role
      const nextBodega = data.bodega ? normalizeBodega(data.bodega) : target.bodega
      const nextActivo = data.activo ?? target.activo

      if (actor.role === 'SUP' && nextRole === 'ADMIN') {
        throw new HttpError('Supervisor no puede convertir usuarios a administrador', 403)
      }

      let nextPasswordHash: string | undefined
      if (data.password) {
        nextPasswordHash = await bcrypt.hash(data.password, 10)
      }

      const result = await pool.query(
        `
        UPDATE users
        SET
          email = $2,
          full_name = $3,
          role = $4,
          bodega = $5,
          activo = $6,
          password_hash = COALESCE($7, password_hash),
          updated_at = now()
        WHERE id = $1
        RETURNING
          id,
          email,
          full_name AS "fullName",
          role,
          bodega,
          activo,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        `,
        [target.id, nextEmail, nextFullName, nextRole, nextBodega, nextActivo, nextPasswordHash ?? null]
      )

      res.json({
        ok: true,
        item: result.rows[0],
      })
    } catch (error: any) {
      if (error?.code === '23505') {
        return next(new HttpError('Ya existe un usuario con ese correo', 409))
      }

      return next(error)
    }
  })

  return router
}