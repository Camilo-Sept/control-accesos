const rawApiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'

export const API_BASE = rawApiBase.replace(/\/+$/, '')

export const TABLET_API_KEY =
  import.meta.env.VITE_TABLET_API_KEY ?? 'API_KEY_DEL_DISPOSITIVO'

export const DEVICE_ID =
  import.meta.env.VITE_DEVICE_ID ?? 'tablet-puerta-1'