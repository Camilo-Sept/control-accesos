import express from 'express'
import cors from 'cors'
import { env } from './lib/env'
import { healthRoutes } from './routes/health.routes'
import { dashboardRoutes } from './routes/dashboard.routes'
import { registrosRoutes } from './routes/registros.routes'
import { authRoutes } from './routes/auth.routes'
import { HttpError } from './lib/httpErrors'

export function createApp() {
  const app = express()

  app.use(cors({ origin: env.corsOrigin, credentials: true }))
  app.use(express.json({ limit: '2mb' }))

  app.use('/health', healthRoutes())
  app.use('/auth', authRoutes()) // ✅ AQUÍ
  app.use('/dashboard', dashboardRoutes())
  app.use('/registros', registrosRoutes())

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }))

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, details: err.details })
    console.error(err)
    return res.status(500).json({ error: 'Internal Server Error' })
  })

  return app
}
