import { apiGet } from '@/lib/api'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

type PageProps = {
  searchParams: SearchParams
}

type Persona = {
  id: string
  nombre: string
  noEmpleado: string | null
  empresa: string | null
  area: string | null
  bodega: string | null
  tipoPersona: 'EMPLEADO' | 'VISITANTE' | 'PROVEEDOR' | 'CONTRATISTA'
  activo: boolean
  qrValue: string | null
  telefono: string | null
  email: string | null
  notas: string | null
  createdAt: string
  updatedAt: string
}

type PersonasResponse = {
  total: number
  limit: number
  offset: number
  items: Persona[]
}

function first(v: string | string[] | undefined) {
  if (!v) return ''
  return Array.isArray(v) ? v[0] ?? '' : v
}

function formatDateTime(value: string) {
  try {
    return new Date(value).toLocaleString('es-MX')
  } catch {
    return value
  }
}

export default async function PersonasPage({ searchParams }: PageProps) {
  const params = await searchParams

  const q = first(params.q)
  const tipoPersona = first(params.tipoPersona)
  const activo = first(params.activo)
  const limit = first(params.limit) || '50'
  const offset = first(params.offset) || '0'

  const qs = new URLSearchParams()
  if (q.trim()) qs.set('q', q.trim())
  if (tipoPersona.trim()) qs.set('tipoPersona', tipoPersona.trim())
  if (activo.trim()) qs.set('activo', activo.trim())
  qs.set('limit', limit)
  qs.set('offset', offset)

  const data = await apiGet<PersonasResponse>(`/personas?${qs.toString()}`)

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Personas</h1>
        <p className="text-sm text-slate-500">
          Catálogo / censo de personas. Total:{' '}
          <span className="font-medium text-slate-900">{data.total}</span>
        </p>
      </div>

      <form action="/personas" method="get" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input type="hidden" name="offset" value="0" />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600">Buscar</label>
            <input
              name="q"
              defaultValue={q}
              placeholder="Nombre, empleado, empresa, QR..."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Tipo</label>
            <select
              name="tipoPersona"
              defaultValue={tipoPersona}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="EMPLEADO">EMPLEADO</option>
              <option value="VISITANTE">VISITANTE</option>
              <option value="PROVEEDOR">PROVEEDOR</option>
              <option value="CONTRATISTA">CONTRATISTA</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Activo</label>
            <select
              name="activo"
              defaultValue={activo}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="1">Sí</option>
              <option value="0">No</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Límite</label>
            <select
              name="limit"
              defaultValue={limit}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <div className="md:col-span-5 flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Nombre</th>
              <th className="px-4 py-3 text-left font-medium">No. Empleado</th>
              <th className="px-4 py-3 text-left font-medium">Tipo</th>
              <th className="px-4 py-3 text-left font-medium">Empresa</th>
              <th className="px-4 py-3 text-left font-medium">Bodega</th>
              <th className="px-4 py-3 text-left font-medium">QR</th>
              <th className="px-4 py-3 text-left font-medium">Activo</th>
              <th className="px-4 py-3 text-left font-medium">Creado</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((it) => (
              <tr key={it.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{it.nombre}</td>
                <td className="px-4 py-3">{it.noEmpleado ?? '-'}</td>
                <td className="px-4 py-3">{it.tipoPersona}</td>
                <td className="px-4 py-3">{it.empresa ?? '-'}</td>
                <td className="px-4 py-3">{it.bodega ?? '-'}</td>
                <td className="px-4 py-3">{it.qrValue ?? '-'}</td>
                <td className="px-4 py-3">
                  {it.activo ? (
                    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                      ACTIVO
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      INACTIVO
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(it.createdAt)}</td>
              </tr>
            ))}

            {!data.items.length && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={8}>
                  No hay personas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
