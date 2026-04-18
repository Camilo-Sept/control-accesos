import { Request, Response, NextFunction } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { HttpError } from '../lib/httpErrors'

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
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const header = String(req.headers.authorization ?? '')
      const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
      if (!token) throw new HttpError('No autorizado', 401)

      const secret = process.env.JWT_SECRET
      if (!secret) throw new Error('JWT_SECRET no está configurado')

      const decoded = jwt.verify(token, secret) as JwtPayload
      const role = String(decoded.role ?? '') as UserRole

      if (!decoded.sub || !decoded.email || !role) {
        throw new HttpError('No autorizado', 401)
      }

      req.authUser = {
        sub: String(decoded.sub),
        email: String(decoded.email),
        role,
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
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