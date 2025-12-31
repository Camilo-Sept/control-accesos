'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

type NavItem = { href: string; label: string }

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/registros', label: 'Registros' },
  { href: '/dashboard/sync-logs', label: 'Sync Logs' },
]

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname.startsWith(href)
}

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

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
              <div className="text-xs text-slate-500">Admin</div>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((it) => {
              const active = isActive(pathname, it.href)
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={[
                    'rounded-2xl px-3 py-2 text-sm font-semibold transition',
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {it.label}
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
