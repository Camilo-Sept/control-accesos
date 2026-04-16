import Link from 'next/link'
import { cleanSearchParams } from '@/lib/cleanSearchParams'
import { apiGet } from '@/lib/api'
import { SectionHeader } from '@/components/SectionHeader'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

type PageProps = {
  searchParams: SearchParams
}

type RegistroItem = {
  id: string
  tipo: 'ENTRADA' | 'SALIDA'
  tipoEntidad: 'PEATON' | 'VEHICULO'
  categoria: 'EMPLEADO' | 'PROVEEDOR' | 'VISITANTE'
  nombre: string | null
  noEmpleado: string | null
  empresa: string | null
  bodega: string | null
  asunto: string | null
  placa: string | null
  fechaHora: string
  dispositivoId: string
  salidaSinEntrada: boolean
}

type RegistrosResponse = {
  total: number
  limit: number
  offset: number
  items: RegistroItem[]
}

function withParams(
  basePath: string,
  sp: URLSearchParams,
  patch: Record<string, string | null>
) {
  const next = new URLSearchParams(sp.toString())

  for (const [k, v] of Object.entries(patch)) {
    if (v === null) next.delete(k)
    else next.set(k, v)
  }

  const qs = next.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

function formatDateTime(value: string) {
  try {
    return new Date(value).toLocaleString('es-MX')
  } catch {
    return value
  }
}

function isoToLocalInput(value: string) {
  try {
    const d = new Date(value)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
  } catch {
    return ''
  }
}

function TipoBadge({ tipo }: { tipo: RegistroItem['tipo'] }) {
  return tipo === 'ENTRADA' ? (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      ENTRADA
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
      SALIDA
    </span>
  )
}

export default async function RegistrosPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const sp = cleanSearchParams(resolvedSearchParams)

  const limit = Number(sp.get('limit') ?? '50')
  const offset = Number(sp.get('offset') ?? '0')

  if (!sp.get('limit')) sp.set('limit', String(Number.isFinite(limit) ? limit : 50))
  if (!sp.get('offset')) sp.set('offset', String(Number.isFinite(offset) ? offset : 0))

  const q = sp.get('q') ?? ''
  const tipo = sp.get('tipo') ?? ''
  const categoria = sp.get('categoria') ?? ''
  const dispositivoId = sp.get('dispositivoId') ?? ''
  const bodega = sp.get('bodega') ?? ''
  const from = sp.get('from') ?? ''
  const to = sp.get('to') ?? ''

  const hoy =
    sp.has('hoy') && (sp.get('hoy') === '1' || sp.get('hoy') === 'true')

  const salidaSinEntrada =
    sp.has('salidaSinEntrada') &&
    (sp.get('salidaSinEntrada') === '1' || sp.get('salidaSinEntrada') === 'true')

  const query = sp.toString()

  const data = await apiGet<RegistrosResponse>(`/registros?${query}`)

  const exportXlsxUrl = `/api/registros/export.xlsx?${query}`
  const exportPdfUrl = `/api/registros/export.pdf?${query}`

  const hasPrev = data.offset > 0
  const hasNext = data.offset + data.limit < data.total

  const prevOffset = Math.max(0, data.offset - data.limit)
  const nextOffset = data.offset + data.limit

  const prevHref = withParams('/registros', sp, { offset: String(prevOffset) })
  const nextHref = withParams('/registros', sp, { offset: String(nextOffset) })

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      <div className="space-y-4">
        <SectionHeader
          title="Registros"
          description={`Historial de accesos. Total: ${data.total}`}
          actions={[
            { href: '/dashboard', label: 'Dashboard' },
            { href: '/personas', label: 'Personas' },
          ]}
        />

        <div className="flex flex-wrap gap-2">
          <a
            href={exportXlsxUrl}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Exportar Excel
          </a>
          <a
            href={exportPdfUrl}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Exportar PDF
          </a>
        </div>
      </div>

      <form
        action="/registros"
        method="get"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <input type="hidden" name="limit" value={String(data.limit)} />
        <input type="hidden" name="offset" value="0" />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600">Buscar</label>
            <input
              name="q"
              defaultValue={q}
              placeholder="Nombre, empleado, placa..."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Tipo</label>
            <select
              name="tipo"
              defaultValue={tipo}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="ENTRADA">ENTRADA</option>
              <option value="SALIDA">SALIDA</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Categoría</label>
            <select
              name="categoria"
              defaultValue={categoria}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              <option value="EMPLEADO">EMPLEADO</option>
              <option value="PROVEEDOR">PROVEEDOR</option>
              <option value="VISITANTE">VISITANTE</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Dispositivo</label>
            <input
              name="dispositivoId"
              defaultValue={dispositivoId}
              placeholder="TABLET-01"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Bodega</label>
            <input
              name="bodega"
              defaultValue={bodega}
              placeholder="BODEGA 1"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Desde</label>
            <input
              type="datetime-local"
              name="from"
              defaultValue={from ? isoToLocalInput(from) : ''}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Hasta</label>
            <input
              type="datetime-local"
              name="to"
              defaultValue={to ? isoToLocalInput(to) : ''}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-4 md:col-span-2">
            <label className="mt-5 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="hoy"
                value="1"
                defaultChecked={hoy}
                className="h-4 w-4"
              />
              Hoy
            </label>

            <label className="mt-5 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="salidaSinEntrada"
                value="1"
                defaultChecked={salidaSinEntrada}
                className="h-4 w-4"
              />
              Salida sin entrada
            </label>
          </div>

          <div className="md:col-span-2 flex items-end gap-2">
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Aplicar filtros
            </button>

            <Link
              href="/registros"
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-center text-sm font-medium hover:bg-slate-50"
            >
              Limpiar
            </Link>
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                <th className="px-4 py-3 text-left font-semibold">Entidad</th>
                <th className="px-4 py-3 text-left font-semibold">Categoría</th>
                <th className="px-4 py-3 text-left font-semibold">Nombre</th>
                <th className="px-4 py-3 text-left font-semibold">No. Empleado</th>
                <th className="px-4 py-3 text-left font-semibold">Empresa</th>
                <th className="px-4 py-3 text-left font-semibold">Bodega</th>
                <th className="px-4 py-3 text-left font-semibold">Placa</th>
                <th className="px-4 py-3 text-left font-semibold">Asunto</th>
                <th className="px-4 py-3 text-left font-semibold">Dispositivo</th>
                <th className="px-4 py-3 text-left font-semibold">Bandera</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {data.items.map((it) => (
                <tr key={it.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {formatDateTime(it.fechaHora)}
                  </td>
                  <td className="px-4 py-3">
                    <TipoBadge tipo={it.tipo} />
                  </td>
                  <td className="px-4 py-3 text-slate-700">{it.tipoEntidad}</td>
                  <td className="px-4 py-3 text-slate-700">{it.categoria}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{it.nombre ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{it.noEmpleado ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{it.empresa ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{it.bodega ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{it.placa ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{it.asunto ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{it.dispositivoId}</td>
                  <td className="px-4 py-3">
                    {it.salidaSinEntrada ? (
                      <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                        SALIDA SIN ENTRADA
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}

              {!data.items.length && (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={12}>
                    No hay registros para esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {hasPrev ? (
          <Link
            href={prevHref}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Anterior
          </Link>
        ) : (
          <span />
        )}

        {hasNext ? (
          <Link
            href={nextHref}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Siguiente →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  )
}