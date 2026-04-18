'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type Role = 'ADMIN' | 'SUP' | 'GUARD'

type NavItem = {
  href: string
  label: string
  allowedRoles: Role[]
}

type MeResponse = {
  ok: boolean
  user: {
    id: string
    email: string
    role: Role
  }
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', allowedRoles: ['ADMIN', 'SUP'] },
  { href: '/registros', label: 'Registros', allowedRoles: ['ADMIN', 'SUP'] },
  { href: '/personas', label: 'Personas', allowedRoles: ['ADMIN', 'SUP'] },
  { href: '/dashboard/usuarios', label: 'Usuarios', allowedRoles: ['ADMIN', 'SUP'] },
  { href: '/dashboard/sync-logs', label: 'Sync Logs', allowedRoles: ['ADMIN'] },
]

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard' || pathname.startsWith('/dashboard/')
  return pathname === href || pathname.startsWith(href + '/')
}

function roleLabel(role: Role | null): string {
  if (role === 'ADMIN') return 'Administrador'
  if (role === 'SUP') return 'Supervisor'
  if (role === 'GUARD') return 'Guardia'
  return 'Panel'
}

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [currentRole, setCurrentRole] = useState<Role | null>(null)
  const [loadingRole, setLoadingRole] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadMe() {
      try {
        setLoadingRole(true)

        const response = await fetch('/api/auth/me', {
          method: 'GET',
          cache: 'no-store',
        })

        if (!response.ok) {
          if (!cancelled) {
            setCurrentRole(null)
          }
          return
        }

        const data = (await response.json()) as MeResponse

        if (!cancelled) {
          setCurrentRole(data.user.role)
        }
      } catch {
        if (!cancelled) {
          setCurrentRole(null)
        }
      } finally {
        if (!cancelled) {
          setLoadingRole(false)
        }
      }
    }

    void loadMe()

    return () => {
      cancelled = true
    }
  }, [pathname])

  const visibleItems = useMemo(() => {
    if (!currentRole) return []
    return navItems.filter((item) => item.allowedRoles.includes(currentRole))
  }, [currentRole])

  const onLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
  }

  return (
    <header className="sticky top-0 z-20 mb-4">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
              CA
            </div>

            <div>
              <div className="text-sm font-semibold leading-4">Control de Accesos</div>
              <div className="text-xs text-slate-500">
                {loadingRole ? 'Cargando...' : roleLabel(currentRole)}
              </div>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            {visibleItems.map((item) => {
              const active = isActive(pathname, item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'rounded-2xl px-3 py-2 text-sm font-semibold transition',
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {item.label}
                </Link>
              )
            })}

            <button
              onClick={onLogout}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cerrar sesión
            </button>
          </nav>
        </div>
      </div>
    </header>
  )
}