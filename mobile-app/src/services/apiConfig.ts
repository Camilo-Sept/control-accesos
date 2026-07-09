function requiredEnv(name: string, value?: string): string {
  const normalized = value?.trim()
  if (!normalized) {
    throw new Error(`${name} es obligatorio para iniciar la app móvil.`)
  }
  return normalized
}

const rawApiBase = requiredEnv('VITE_API_BASE_URL', import.meta.env.VITE_API_BASE_URL)

export const API_BASE = rawApiBase.replace(/\/+$/, '')

export const TABLET_API_KEY = requiredEnv(
  'VITE_TABLET_API_KEY',
  import.meta.env.VITE_TABLET_API_KEY
)

export const DEVICE_ID = requiredEnv('VITE_DEVICE_ID', import.meta.env.VITE_DEVICE_ID)
