import { createHash } from 'crypto'
import { readFile, readdir } from 'fs/promises'
import path from 'path'
import { pool } from '../db/pool'

type Migration = {
  name: string
  path: string
}

async function getMigrations(): Promise<Migration[]> {
  const backendRoot = path.resolve(__dirname, '../..')
  const sqlDir = path.join(backendRoot, 'sql')
  const files = (await readdir(sqlDir))
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort()

  return [
    { name: '001_schema.sql', path: path.join(backendRoot, 'src/db/schema.sql') },
    ...files.map((file) => ({ name: file, path: path.join(sqlDir, file) })),
  ]
}

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `)

  const migrations = await getMigrations()

  for (const migration of migrations) {
    const sql = await readFile(migration.path, 'utf8')
    const checksum = createHash('sha256').update(sql).digest('hex')
    const existing = await pool.query<{ checksum: string }>(
      'SELECT checksum FROM schema_migrations WHERE name = $1',
      [migration.name]
    )

    if (existing.rows[0]) {
      if (existing.rows[0].checksum !== checksum) {
        throw new Error(`La migración ${migration.name} cambió después de aplicarse.`)
      }
      continue
    }

    await pool.query(sql)
    await pool.query(
      'INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)',
      [migration.name, checksum]
    )
    console.log(`[db] aplicada ${migration.name}`)
  }
}

migrate()
  .then(() => console.log('[db] migraciones completas'))
  .finally(() => pool.end())
