import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
//import jwt from 'jsonwebtoken'
import { pool } from '../db/pool'
import { env } from '../lib/env'
import { HttpError } from '../lib/httpErrors'


const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken'
function signToken(payload: { sub: string; email: string; role: string }) {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET no está configurado en backend/.env')

  const expiresIn = (process.env.JWT_EXPIRES_IN || '8h') as SignOptions['expiresIn']

  const jwtPayload: JwtPayload = {
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
  }

  return jwt.sign(jwtPayload, secret, { expiresIn })
}

export function authRoutes() {
  const r = Router()

  // POST /auth/login  => { token, user }
  r.post('/login', async (req, res, next) => {
    try {
      const parsed = LoginSchema.safeParse(req.body)
      if (!parsed.success) throw new HttpError('Payload inválido', 400, parsed.error.flatten())

      const email = parsed.data.email.trim().toLowerCase()
      const password = parsed.data.password

      const userRes = await pool.query(
        `
        SELECT id, email, password_hash, role, activo
        FROM admin_users
        WHERE email = $1
        LIMIT 1
        `,
        [email]
      )

      const u = userRes.rows[0]
      if (!u || !u.activo) throw new HttpError('Credenciales inválidas', 401)

      const ok = await bcrypt.compare(password, u.password_hash)
      if (!ok) throw new HttpError('Credenciales inválidas', 401)

      const token = signToken({ sub: u.id, email: u.email, role: u.role })

      res.json({
        ok: true,
        token,
        user: { id: u.id, email: u.email, role: u.role },
      })
    } catch (e) {
      next(e)
    }
  })

  // GET /auth/me  (Authorization: Bearer <token>)
  r.get('/me', async (req, res, next) => {
    try {
      const auth = String(req.headers.authorization ?? '')
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
      if (!token) throw new HttpError('No autorizado', 401)

      const secret = process.env.JWT_SECRET
      if (!secret) throw new Error('JWT_SECRET no está configurado en backend/.env')

      const decoded = jwt.verify(token, secret) as any
      res.json({
        ok: true,
        user: { id: decoded.sub, email: decoded.email, role: decoded.role },
      })
    } catch (e) {
      next(new HttpError('No autorizado', 401))
    }
  })

  return r
}
