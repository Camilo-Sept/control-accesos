export type AuthRole = 'ADMIN' | 'SUP' | 'GUARD'

export type AuthUser = {
  id: string
  email: string
  role: AuthRole
}

export type AuthSession = {
  token: string
  user: AuthUser
}

const AUTH_STORAGE_KEY = 'control_accesos_mobile_auth_v1'

function safeParse(value: string): AuthSession | null {
  try {
    const parsed = JSON.parse(value) as Partial<AuthSession>

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.token !== 'string' ||
      !parsed.user ||
      typeof parsed.user !== 'object' ||
      typeof parsed.user.id !== 'string' ||
      typeof parsed.user.email !== 'string' ||
      typeof parsed.user.role !== 'string'
    ) {
      return null
    }

    const role = parsed.user.role.toUpperCase()

    if (role !== 'ADMIN' && role !== 'SUP' && role !== 'GUARD') {
      return null
    }

    return {
      token: parsed.token,
      user: {
        id: parsed.user.id,
        email: parsed.user.email,
        role,
      },
    }
  } catch {
    return null
  }
}

export const authStorage = {
  read(): AuthSession | null {
    try {
      const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
      if (!raw) return null
      return safeParse(raw)
    } catch {
      return null
    }
  },

  write(session: AuthSession) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
  },

  clear() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
  },
}