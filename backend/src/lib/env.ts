import 'dotenv/config'

function must(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

export const env = {
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: must('DATABASE_URL'),
  corsOrigin: process.env.CORS_ORIGIN ?? '*'
}
