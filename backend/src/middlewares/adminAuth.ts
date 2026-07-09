import type { Request, Response, NextFunction } from 'express'
import { requireRoles } from './requireRoles'

declare global {
  namespace Express {
    interface Request {
      admin?: { id: string; email: string; role: string }
    }
  }
}

export function requireAdminJwt(req: Request, _res: Response, next: NextFunction) {
  return requireRoles('ADMIN', 'SUP')(req, _res, (error?: unknown) => {
    if (!error && req.authUser) {
      req.admin = {
        id: req.authUser.sub,
        email: req.authUser.email,
        role: req.authUser.role,
      }
    }
    next(error)
  })
}
