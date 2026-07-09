import 'dotenv/config'
import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),

  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3000,http://localhost:3002,http://localhost:5173'),

  TABLET_API_KEY: z.string().min(24, 'TABLET_API_KEY debe tener al menos 24 caracteres'),
  TABLET_DEVICE_ID: z.string().trim().min(1, 'TABLET_DEVICE_ID es obligatorio'),
  TABLET_DEVICE_NAME: z.string().trim().min(1).default('Tablet Acceso Principal'),
  REQUIRE_DEVICE_AUTH: z
    .enum(['0', '1'])
    .default('1')
    .transform((value) => value === '1'),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  ADMIN_NAME: z.string().trim().min(1).optional(),
})

const parsed = EnvSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas')
  console.error(parsed.error.flatten().fieldErrors)
  throw new Error('Invalid environment variables')
}

const data = parsed.data

export const env = {
  nodeEnv: data.NODE_ENV,
  port: data.PORT,
  databaseUrl: data.DATABASE_URL,
  jwtSecret: data.JWT_SECRET,
  corsOrigin: data.CORS_ORIGIN,
  tabletApiKey: data.TABLET_API_KEY,
  tabletDeviceId: data.TABLET_DEVICE_ID,
  tabletDeviceName: data.TABLET_DEVICE_NAME,
  requireDeviceAuth: data.REQUIRE_DEVICE_AUTH,
  adminEmail: data.ADMIN_EMAIL,
  adminPassword: data.ADMIN_PASSWORD,
  adminName: data.ADMIN_NAME,
}
