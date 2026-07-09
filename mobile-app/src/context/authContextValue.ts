import { createContext } from 'react'
import type { AuthRole, AuthUser } from '../services/authService'

export type LoginInput = {
  email: string
  password: string
}

export type AuthContextValue = {
  isReady: boolean
  isAuthenticated: boolean
  token: string | null
  user: AuthUser | null
  role: AuthRole | null
  login: (input: LoginInput) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
