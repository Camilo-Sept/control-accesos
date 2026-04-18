import { API_BASE } from './apiConfig'
import type { AuthRole, AuthSession, AuthUser } from './authStorage'

type LoginResponse = {
  ok: boolean
  token: string
  user: {
    id: string
    email: string
    role: string
  }
}

type ApiErrorPayload = {
  error?: string
  message?: string
  details?: unknown
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (normalized.length % 4)) % 4
  const padded = normalized + '='.repeat(padLength)

  try {
    return atob(padded)
  } catch {
    return ''
  }
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) return null

  const decoded = decodeBase64Url(parts[1])
  if (!decoded) return null

  try {
    return JSON.parse(decoded) as Record<string, unknown>
  } catch {
    return null
  }
}

function isTokenExpired(token: string): boolean {
  const payload = parseJwtPayload(token)
  const exp = payload?.exp

  if (typeof exp !== 'number') {
    return false
  }

  const now = Math.floor(Date.now() / 1000)
  return exp <= now
}

function normalizeRole(value: string): AuthRole {
  const role = value.trim().toUpperCase()

  if (role === 'ADMIN' || role === 'SUP' || role === 'GUARD') {
    return role
  }

  throw new Error('Rol no permitido para la app móvil.')
}

function getApiErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return 'No se pudo iniciar sesión.'
  }

  const maybeError = payload as ApiErrorPayload

  if (typeof maybeError.error === 'string' && maybeError.error.trim()) {
    return maybeError.error
  }

  if (typeof maybeError.message === 'string' && maybeError.message.trim()) {
    return maybeError.message
  }

  return 'No se pudo iniciar sesión.'
}

export const authService = {
  async login(email: string, password: string): Promise<AuthSession> {
    const emailNormalized = email.trim().toLowerCase()
    const passwordNormalized = password.trim()

    if (!emailNormalized) {
      throw new Error('Ingresa tu correo.')
    }

    if (!passwordNormalized) {
      throw new Error('Ingresa tu contraseña.')
    }

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: emailNormalized,
        password: passwordNormalized,
      }),
    })

    const payload = (await response.json().catch(() => null)) as
      | LoginResponse
      | ApiErrorPayload
      | null

    if (!response.ok || !payload || !('token' in payload) || !payload.token || !payload.user) {
      throw new Error(getApiErrorMessage(payload))
    }

    const user: AuthUser = {
      id: payload.user.id,
      email: payload.user.email,
      role: normalizeRole(payload.user.role),
    }

    const session: AuthSession = {
      token: payload.token,
      user,
    }

    if (!this.isSessionUsable(session)) {
      throw new Error('La sesión recibida no es válida o ya expiró.')
    }

    return session
  },

  isSessionUsable(session: AuthSession | null): boolean {
    if (!session?.token || !session?.user?.email || !session?.user?.role) {
      return false
    }

    if (isTokenExpired(session.token)) {
      return false
    }

    return true
  },
}

export type { AuthRole, AuthSession, AuthUser }