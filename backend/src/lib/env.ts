import 'dotenv/config'
import { z } from 'zod'

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),

  JWT_SECRET: z.string().min(1, 'JWT_SECRET es obligatorio'),

  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3000,http://localhost:3002,http://localhost:5173'),

  TABLET_API_KEY: z.string().default('API_KEY_DEL_DISPOSITIVO'),
})

const parsed = EnvSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas')
  console.error(parsed.error.flatten().fieldErrors)
  throw new Error('Invalid environment variables')
}

const data = parsed.data

export const env = {
  port: data.PORT,
  databaseUrl: data.DATABASE_URL,
  jwtSecret: data.JWT_SECRET,
  corsOrigin: data.CORS_ORIGIN,
  tabletApiKey: data.TABLET_API_KEY,
}