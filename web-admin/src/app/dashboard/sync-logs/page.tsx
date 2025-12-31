import { apiGet } from '@/lib/api'

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
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const limit = toStr(searchParams?.limit) || '50'
  const offset = toStr(searchParams?.offset) || '0'
  const dispositivoId = toStr(searchParams?.dispositivoId)
  const soloErrores = toStr(searchParams?.soloErrores) // '' | '1'

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
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Sync Logs</h1>
        <p className="mt-2 text-red-600">Error cargando logs</p>
        <pre className="mt-4 whitespace-pre-wrap rounded bg-gray-100 p-3 text-xs">{msg}</pre>
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
    <div className="p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sync Logs</h1>
          <p className="text-sm text-gray-500">
            Total: <span className="font-medium text-gray-800">{data.total}</span>
          </p>
        </div>

        <form className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-600">Dispositivo</label>
            <input
              name="dispositivoId"
              defaultValue={dispositivoId}
              placeholder="TABLET-01"
              className="h-10 w-44 rounded border border-gray-300 px-3 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600">Solo errores</label>
            <select
              name="soloErrores"
              defaultValue={soloErrores || ''}
              className="h-10 w-36 rounded border border-gray-300 px-3 text-sm"
            >
              <option value="">No</option>
              <option value="1">Sí</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600">Limit</label>
            <select
              name="limit"
              defaultValue={String(limitN)}
              className="h-10 w-28 rounded border border-gray-300 px-3 text-sm"
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

      <div className="mt-5 overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-left">Dispositivo</th>
              <th className="px-3 py-2 text-right">Enviados</th>
              <th className="px-3 py-2 text-right">Confirmados</th>
              <th className="px-3 py-2 text-left">IP</th>
              <th className="px-3 py-2 text-left">Error</th>
            </tr>
          </thead>

          <tbody>
            {data.items.map((it) => (
              <tr key={it.id} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">{new Date(it.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">{it.dispositivoId ?? '-'}</td>
                <td className="px-3 py-2 text-right">{it.receivedCount}</td>
                <td className="px-3 py-2 text-right">{it.confirmedCount}</td>
                <td className="px-3 py-2">{it.ip ?? '-'}</td>
                <td className="px-3 py-2">
                  {it.error ? (
                    <span className="rounded bg-red-50 px-2 py-1 text-red-700">{it.error}</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}

            {!data.items.length && (
              <tr className="border-t">
                <td className="px-3 py-6 text-center text-gray-500" colSpan={6}>
                  No hay logs todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <a className="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50" href={prevHref}>
          ← Anterior
        </a>

        <a className="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50" href={nextHref}>
          Siguiente →
        </a>
      </div>
    </div>
  )
}
