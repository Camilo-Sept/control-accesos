import { Router } from 'express'
import { DashboardRepo } from '../repos/dashboard.repo'

export function dashboardRoutes() {
  const r = Router()
  const repo = new DashboardRepo()

  r.get('/stats', async (req, res, next) => {
    try {
      const bodegaId = typeof req.query.bodegaId === 'string' ? req.query.bodegaId : undefined
      const stats = await repo.getStats({ bodegaId })
      res.json(stats)
    } catch (e) {
      next(e)
    }
  })

  return r
}
