import { Pool } from 'pg'
import { env } from '../lib/env'

export const pool = new Pool({
  connectionString: env.databaseUrl
})
