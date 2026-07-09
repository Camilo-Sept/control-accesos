import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'
import { env } from '../lib/env'
import { pool } from '../db/pool'

async function seedAdmin() {
  if (!env.adminEmail || !env.adminPassword) {
    throw new Error('ADMIN_EMAIL y ADMIN_PASSWORD son obligatorios para crear el administrador.')
  }

  const email = env.adminEmail.trim().toLowerCase()
  const fullName = env.adminName?.trim() || 'Ivan Orpineda'
  const passwordHash = await bcrypt.hash(env.adminPassword, 12)
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await client.query(
      `UPDATE users SET role = 'SUP', activo = false, updated_at = now()
       WHERE role = 'ADMIN' AND email <> $1`,
      [email]
    )
    await client.query(
      `
      INSERT INTO users (email, password_hash, full_name, role, bodega, activo)
      VALUES ($1, $2, $3, 'ADMIN', 'GENERAL', true)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        full_name = EXCLUDED.full_name,
        role = 'ADMIN',
        bodega = 'GENERAL',
        activo = true,
        updated_at = now()
      `,
      [email, passwordHash, fullName]
    )
    await client.query(
      `
      INSERT INTO dispositivos (id, api_key_hash, nombre, activo)
      VALUES ($1, $2, $3, true)
      ON CONFLICT (id) DO UPDATE SET
        api_key_hash = EXCLUDED.api_key_hash,
        nombre = EXCLUDED.nombre,
        activo = true
      `,
      [
        env.tabletDeviceId,
        createHash('sha256').update(env.tabletApiKey).digest('hex'),
        env.tabletDeviceName,
      ]
    )
    await client.query('COMMIT')
    console.log('[db] administrador único y dispositivo configurados')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

seedAdmin()
  .finally(() => pool.end())
