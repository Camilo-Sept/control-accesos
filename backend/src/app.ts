import express from 'express'
import cors, { type CorsOptions } from 'cors'
import { env } from './lib/env'
import { healthRoutes } from './routes/health.routes'
import { dashboardRoutes } from './routes/dashboard.routes'
import { registrosRoutes } from './routes/registros.routes'
import { authRoutes } from './routes/auth.routes'
import { HttpError } from './lib/httpErrors'
import { personasRoutes } from './routes/personas.routes'
import { usersRoutes } from './routes/users.routes'

function buildAllowedOrigins() {
  return env.corsOrigin
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

export function createApp() {
  const app = express()

  const allowedOrigins = buildAllowedOrigins()

  const corsOptions: CorsOptions = {
    origin(origin, callback) {
      if (!origin) return callback(null, true)

      if (allowedOrigins.includes(origin)) {
        return callback(null, true)
      }

      return callback(new Error(`Origen no permitido por CORS: ${origin}`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  }

  app.use(cors(corsOptions))
  app.options(/^.*$/, cors(corsOptions))

  app.use(express.json({ limit: '2mb' }))

  app.use(usersRoutes())
  app.use('/health', healthRoutes())
  app.use('/auth', authRoutes())
  app.use('/dashboard', dashboardRoutes())
  app.use('/registros', registrosRoutes())
  app.use('/personas', personasRoutes())

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }))

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if (err instanceof HttpError) {
        return res.status(err.status).json({ error: err.message, details: err.details })
      }

      if (err instanceof Error && err.message.startsWith('Origen no permitido por CORS:')) {
        return res.status(403).json({ error: err.message })
      }

      console.error(err)
      return res.status(500).json({ error: 'Internal Server Error' })
    }
  )

  return app
}