'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const IDLE_MS = 5 * 60 * 1000 // 5 min
const RESET_THROTTLE_MS = 1_000 // evita resetear 2000 veces por mousemove

export function IdleLogout() {
  const router = useRouter()

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastResetRef = useRef<number>(0)
  const hasLoggedOutRef = useRef<boolean>(false)

  useEffect(() => {
    hasLoggedOutRef.current = false

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    const doLogout = async () => {
      if (hasLoggedOutRef.current) return
      hasLoggedOutRef.current = true

      try {
        await fetch('/api/auth/logout', { method: 'POST' })
      } finally {
        router.replace('/login')
        // refresh ayuda a limpiar estado de RSC si quedara algo en cache
        router.refresh()
      }
    }

    const reset = () => {
      const now = Date.now()
      if (now - lastResetRef.current < RESET_THROTTLE_MS) return
      lastResetRef.current = now

      clearTimer()
      timerRef.current = setTimeout(doLogout, IDLE_MS)
    }

    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'focus',
    ]

    events.forEach((ev) => window.addEventListener(ev, reset, { passive: true }))

    // inicia conteo
    reset()

    return () => {
      clearTimer()
      events.forEach((ev) => window.removeEventListener(ev, reset))
    }
  }, [router])

  return null
}
