import type { Request, Response, NextFunction } from 'express'
import jwt, { type JwtPayload as JwtPayloadBase } from 'jsonwebtoken'
import { env } from '../lib/env'
import { HttpError } from '../lib/httpErrors'

type JwtPayload = JwtPayloadBase & {
  sub: string
  email: string
  role: string
}

declare global {
  namespace Express {
    interface Request {
      admin?: { id: string; email: string; role: string }
    }
  }
}

export function requireAdminJwt(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    // ✅ HttpError espera (message, status)
    return next(new HttpError('No autorizado', 401))
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret)

    // jsonwebtoken puede devolver string o payload
    if (typeof decoded === 'string') {
      return next(new HttpError('Token inválido', 401))
    }

    const payload = decoded as JwtPayload

    req.admin = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    }

    return next()
  } catch {
    return next(new HttpError('Token inválido o expirado', 401))
  }
}
