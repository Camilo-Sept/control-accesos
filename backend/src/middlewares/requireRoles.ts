import { Request, Response, NextFunction } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { HttpError } from '../lib/httpErrors'
import { env } from '../lib/env'
import { pool } from '../db/pool'

export type UserRole = 'ADMIN' | 'SUP' | 'GUARD'

export type AuthUser = {
  sub: string
  email: string
  role: UserRole
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser
    }
  }
}

export function requireRoles(...allowedRoles: UserRole[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const header = String(req.headers.authorization ?? '')
      const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
      if (!token) throw new HttpError('No autorizado', 401)

      const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload
      const tokenRole = String(decoded.role ?? '') as UserRole

      if (!decoded.sub || !decoded.email || !tokenRole) {
        throw new HttpError('No autorizado', 401)
      }

      const result = await pool.query<{
        id: string
        email: string
        role: UserRole
        activo: boolean
      }>(
        `SELECT id, email, role, activo FROM users WHERE id = $1 LIMIT 1`,
        [String(decoded.sub)]
      )
      const user = result.rows[0]

      if (!user?.activo) {
        throw new HttpError('No autorizado', 401)
      }

      req.authUser = {
        sub: user.id,
        email: user.email,
        role: user.role,
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        throw new HttpError('Prohibido', 403)
      }

      next()
    } catch (error) {
      if (error instanceof HttpError && error.status === 403) {
        return next(error)
      }
      return next(new HttpError('No autorizado', 401))
    }
  }
}
