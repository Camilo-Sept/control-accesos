import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { authService, type AuthSession } from '../services/authService'
import { authStorage } from '../services/authStorage'
import { AuthContext, type AuthContextValue, type LoginInput } from './authContextValue'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const [session, setSession] = useState<AuthSession | null>(null)

  useEffect(() => {
    const stored = authStorage.read()

    if (stored && authService.isSessionUsable(stored)) {
      setSession(stored)
    } else {
      authStorage.clear()
      setSession(null)
    }

    setIsReady(true)
  }, [])

  const login = useCallback(async ({ email, password }: LoginInput) => {
    const nextSession = await authService.login(email, password)
    authStorage.write(nextSession)
    setSession(nextSession)
  }, [])

  const logout = useCallback(async () => {
    authStorage.clear()
    setSession(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady,
      isAuthenticated: !!session?.token,
      token: session?.token ?? null,
      user: session?.user ?? null,
      role: session?.user?.role ?? null,
      login,
      logout,
    }),
    [isReady, session, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
