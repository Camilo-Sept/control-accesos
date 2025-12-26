import { Router } from 'express'
import { pool } from '../db/pool'

export function healthRoutes() {
  const r = Router()

  r.get('/', async (_req, res, next) => {
    try {
      const db = await pool.query('SELECT 1 as ok')
      res.json({ ok: true, db: db.rows[0]?.ok === 1, at: new Date().toISOString() })
    } catch (e) {
      next(e)
    }
  })

  return r
}
