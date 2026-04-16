import Link from 'next/link'
import { apiGet } from '@/lib/api'
import { SectionHeader } from '@/components/SectionHeader'
import PersonaCreateForm from '@/components/PersonaCreateForm'
import type { Persona, PersonaCatalogos, PersonasResponse } from '@/types/persona'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

type PageProps = {
  searchParams: SearchParams
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

function PersonaBadge({ persona }: { persona: Persona }) {
  return persona.activo ? (
    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-700">
      ACTIVO
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold tracking-wide text-slate-600">
      INACTIVO
    </span>
  )
}

function CellText({
  value,
  wrap = false,
  strong = false,
}: {
  value: string
  wrap?: boolean
  strong?: boolean
}) {
  return (
    <div
      className={[
        'text-slate-800',
        strong ? 'font-semibold' : 'font-medium',
        wrap ? 'break-words whitespace-normal' : 'truncate',
      ].join(' ')}
      title={value}
    >
      {value}
    </div>
  )
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

  const [data, catalogos] = await Promise.all([
    apiGet<PersonasResponse>(`/personas?${qs.toString()}`),
    apiGet<PersonaCatalogos>('/personas/catalogos'),
  ])

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-6">
      <SectionHeader
        title="Personas"
        description={`Catálogo / censo de personas. Total: ${data.total}`}
        actions={[
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/qr', label: 'Generador QR' },
        ]}
      />

      <PersonaCreateForm catalogos={catalogos} />

      <form
        action="/personas"
        method="get"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <input type="hidden" name="offset" value="0" />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600">Buscar</label>
            <input
              name="q"
              defaultValue={q}
              placeholder="Nombre, empleado, empresa, QR..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Tipo</label>
            <select
              name="tipoPersona"
              defaultValue={tipoPersona}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <div className="md:col-span-5 flex gap-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1500px] w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[260px]" />
              <col className="w-[150px]" />
              <col className="w-[170px]" />
              <col className="w-[190px]" />
              <col className="w-[180px]" />
              <col className="w-[220px]" />
              <col className="w-[130px]" />
              <col className="w-[220px]" />
              <col className="w-[180px]" />
            </colgroup>

            <thead>
              <tr className="bg-slate-100">
                <th className="border-b border-r border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  Nombre
                </th>
                <th className="border-b border-r border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  No. Empleado
                </th>
                <th className="border-b border-r border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  Tipo
                </th>
                <th className="border-b border-r border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  Empresa
                </th>
                <th className="border-b border-r border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  Bodega
                </th>
                <th className="border-b border-r border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  QR
                </th>
                <th className="border-b border-r border-slate-200 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                  Activo
                </th>
                <th className="border-b border-r border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  Creado
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {data.items.map((it, index) => (
                <tr
                  key={it.id}
                  className={index % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/40 hover:bg-slate-50'}
                >
                  <td className="border-b border-r border-slate-200 px-4 py-4 align-top">
                    <CellText value={it.nombre} wrap strong />
                  </td>

                  <td className="border-b border-r border-slate-200 px-4 py-4 align-top">
                    <CellText value={it.noEmpleado ?? '-'} />
                  </td>

                  <td className="border-b border-r border-slate-200 px-4 py-4 align-top">
                    <CellText value={it.tipoPersona} />
                  </td>

                  <td className="border-b border-r border-slate-200 px-4 py-4 align-top">
                    <CellText value={it.empresa ?? '-'} wrap />
                  </td>

                  <td className="border-b border-r border-slate-200 px-4 py-4 align-top">
                    <CellText value={it.bodega ?? '-'} wrap />
                  </td>

                  <td className="border-b border-r border-slate-200 px-4 py-4 align-top">
                    <CellText value={it.qrValue ?? '-'} wrap />
                  </td>

                  <td className="border-b border-r border-slate-200 px-4 py-4 align-top text-center">
                    <PersonaBadge persona={it} />
                  </td>

                  <td className="border-b border-r border-slate-200 px-4 py-4 align-top">
                    <CellText value={formatDateTime(it.createdAt)} wrap />
                  </td>

                  <td className="border-b border-slate-200 px-4 py-4 align-middle">
                    <div className="mx-auto flex max-w-[140px] flex-col gap-2">
                      <Link
                        href={`/personas/${it.id}`}
                        className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                      >
                        Editar
                      </Link>

                      <Link
                        href={`/personas/${it.id}#qr-panel`}
                        className="inline-flex w-full items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        Ver QR
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {!data.items.length && (
                <tr>
                  <td
                    className="px-4 py-10 text-center text-sm text-slate-500"
                    colSpan={9}
                  >
                    No hay personas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}