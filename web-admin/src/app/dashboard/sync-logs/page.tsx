import Link from 'next/link'
import { apiGet } from '@/lib/api'
import { SectionHeader } from '@/components/SectionHeader'

type SyncLogItem = {
  id: string
  dispositivoId: string | null
  receivedCount: number
  confirmedCount: number
  ip: string | null
  userAgent: string | null
  error: string | null
  createdAt: string
}

type SyncLogsResponse = {
  total: number
  limit: number
  offset: number
  items: SyncLogItem[]
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function toStr(v: string | string[] | undefined) {
  if (!v) return ''
  return Array.isArray(v) ? v[0] : v
}

function buildHref(base: string, params: Record<string, string>) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== '') qs.set(k, v)
  }
  return `${base}?${qs.toString()}`
}

export default async function SyncLogsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams

  const limit = toStr(params.limit) || '50'
  const offset = toStr(params.offset) || '0'
  const dispositivoId = toStr(params.dispositivoId)
  const soloErrores = toStr(params.soloErrores)

  const qs = new URLSearchParams()
  qs.set('limit', limit)
  qs.set('offset', offset)
  if (dispositivoId) qs.set('dispositivoId', dispositivoId)
  if (soloErrores) qs.set('soloErrores', soloErrores)

  let data: SyncLogsResponse
  try {
    data = await apiGet<SyncLogsResponse>(`/dashboard/sync-logs?${qs.toString()}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return (
      <div className="mx-auto max-w-7xl space-y-4 p-6">
        <SectionHeader
          title="Sync Logs"
          description="No se pudieron cargar los logs."
          actions={[
            { href: '/dashboard', label: 'Dashboard' },
            { href: '/registros', label: 'Registros' },
          ]}
        />

        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">Error cargando logs</p>
          <pre className="mt-3 whitespace-pre-wrap rounded bg-white p-3 text-xs text-slate-700">
            {msg}
          </pre>
        </div>
      </div>
    )
  }

  const limitN = Math.max(parseInt(limit, 10) || 50, 1)
  const offsetN = Math.max(parseInt(offset, 10) || 0, 0)

  const prevOffset = Math.max(offsetN - limitN, 0)
  const nextOffset = offsetN + limitN

  const common = {
    limit: String(limitN),
    dispositivoId,
    soloErrores,
  }

  const prevHref = buildHref('/dashboard/sync-logs', { ...common, offset: String(prevOffset) })
  const nextHref = buildHref('/dashboard/sync-logs', { ...common, offset: String(nextOffset) })

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      <div className="space-y-4">
        <SectionHeader
          title="Sync Logs"
          description={`Total: ${data.total}`}
          actions={[
            { href: '/dashboard', label: 'Dashboard' },
            { href: '/registros', label: 'Registros' },
          ]}
        />

        <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <label className="block text-xs text-slate-600">Dispositivo</label>
            <input
              name="dispositivoId"
              defaultValue={dispositivoId}
              placeholder="TABLET-01"
              className="h-10 w-44 rounded border border-slate-300 px-3 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-600">Solo errores</label>
            <select
              name="soloErrores"
              defaultValue={soloErrores || ''}
              className="h-10 w-36 rounded border border-slate-300 px-3 text-sm"
            >
              <option value="">No</option>
              <option value="1">Sí</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-600">Limit</label>
            <select
              name="limit"
              defaultValue={String(limitN)}
              className="h-10 w-28 rounded border border-slate-300 px-3 text-sm"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>

          <input type="hidden" name="offset" value="0" />

          <button className="h-10 rounded bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700">
            Aplicar
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-3 py-3 text-left">Fecha</th>
              <th className="px-3 py-3 text-left">Dispositivo</th>
              <th className="px-3 py-3 text-right">Enviados</th>
              <th className="px-3 py-3 text-right">Confirmados</th>
              <th className="px-3 py-3 text-left">IP</th>
              <th className="px-3 py-3 text-left">Error</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {data.items.map((it) => (
              <tr key={it.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-3 py-3">
                  {new Date(it.createdAt).toLocaleString('es-MX')}
                </td>
                <td className="px-3 py-3">{it.dispositivoId ?? '-'}</td>
                <td className="px-3 py-3 text-right">{it.receivedCount}</td>
                <td className="px-3 py-3 text-right">{it.confirmedCount}</td>
                <td className="px-3 py-3">{it.ip ?? '-'}</td>
                <td className="px-3 py-3">
                  {it.error ? (
                    <span className="rounded bg-red-50 px-2 py-1 text-red-700">{it.error}</span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
              </tr>
            ))}

            {!data.items.length && (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={6}>
                  No hay logs todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Link
          className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          href={prevHref}
        >
          ← Anterior
        </Link>

        <Link
          className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          href={nextHref}
        >
          Siguiente →
        </Link>
      </div>
    </div>
  )
}