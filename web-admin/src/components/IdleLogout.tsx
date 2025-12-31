'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const IDLE_MS = 5 * 60 * 1000 // 5 min

export function IdleLogout() {
  const router = useRouter()

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null

    const reset = () => {
      if (t) clearTimeout(t)
      t = setTimeout(async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' })
        } finally {
          router.replace('/login')
          router.refresh()
        }
      }, IDLE_MS)
    }

    const events: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((ev) => window.addEventListener(ev, reset, { passive: true }))

    reset()

    return () => {
      if (t) clearTimeout(t)
      events.forEach((ev) => window.removeEventListener(ev, reset))
    }
  }, [router])

  return null
}
