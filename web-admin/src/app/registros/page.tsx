import Link from "next/link";
import { apiGet } from "@/lib/api";

type Registro = {
  id: string;
  tipo: "ENTRADA" | "SALIDA";
  tipoEntidad: "PEATON" | "VEHICULO";
  categoria: "EMPLEADO" | "PROVEEDOR" | "VISITANTE";
  nombre: string | null;
  noEmpleado: string | null;
  empresa: string | null;
  bodega: string | null;
  asunto: string | null;
  placa: string | null;
  modelo: string | null;
  color: string | null;
  qrContenido: string | null;
  fechaHora: string;
  dispositivoId: string;
  salidaSinEntrada: boolean;
};

type ListResponse = {
  total: number;
  limit: number;
  offset: number;
  items: Registro[];
};

function buildQuery(searchParams: Record<string, string | string[] | undefined>) {
  const q = new URLSearchParams();

  const pick = (key: string) => {
    const v = searchParams[key];
    if (!v) return undefined;
    if (Array.isArray(v)) return v[0];
    return v;
  };

  const keys = [
    "q",
    "tipo",
    "categoria",
    "dispositivoId",
    "bodega",
    "from",
    "to",
    "hoy",
    "salidaSinEntrada",
    "limit",
    "offset",
  ] as const;

  for (const k of keys) {
    const v = pick(k);
    if (v && v.trim().length) q.set(k, v);
  }

  if (!q.get("limit")) q.set("limit", "50");
  if (!q.get("offset")) q.set("offset", "0");

  return q.toString();
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-white px-2 py-0.5 text-xs font-medium">
      {children}
    </span>
  );
}
export const dynamic = "force-dynamic";

export default async function RegistrosPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const qs = buildQuery(searchParams);
  const data = await apiGet<ListResponse>(`/registros?${qs}`);

  const limit = data.limit ?? 50;
  const offset = data.offset ?? 0;
  const total = data.total ?? 0;

  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const prevOffset = Math.max(offset - limit, 0);
  const nextOffset = offset + limit;

  const makeLink = (patch: Record<string, string | null>) => {
    const sp = new URLSearchParams(qs);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) sp.delete(k);
      else sp.set(k, v);
    }
    return `/registros?${sp.toString()}`;
  };

  // Export links: usan los filtros del URL (qs)
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) throw new Error("NEXT_PUBLIC_API_BASE_URL no está configurada");
  const exportXlsx = `${base}/registros/export.xlsx?${qs}`;
  const exportPdf = `${base}/registros/export.pdf?${qs}`;

  const getVal = (k: string) => (Array.isArray(searchParams[k]) ? searchParams[k]?.[0] : searchParams[k]) ?? "";

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Registros</h1>
          <p className="text-sm opacity-70">
            Total: <span className="font-semibold">{total}</span> · Página{" "}
            <span className="font-semibold">{page}</span> /{" "}
            <span className="font-semibold">{totalPages}</span>
          </p>
        </div>

        <Link
          href="/dashboard"
          className="rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:shadow"
        >
          ← Volver al dashboard
        </Link>
      </div>

      {/* Filtros */}
      <form action="/registros" method="get" className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <label className="text-xs font-medium opacity-70">Buscar (q)</label>
            <input
              name="q"
              defaultValue={getVal("q")}
              placeholder="Nombre, empleado, placa, empresa..."
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium opacity-70">Tipo</label>
            <select name="tipo" defaultValue={getVal("tipo")} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">
              <option value="">Todos</option>
              <option value="ENTRADA">ENTRADA</option>
              <option value="SALIDA">SALIDA</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium opacity-70">Categoría</label>
            <select
              name="categoria"
              defaultValue={getVal("categoria")}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              <option value="EMPLEADO">EMPLEADO</option>
              <option value="PROVEEDOR">PROVEEDOR</option>
              <option value="VISITANTE">VISITANTE</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium opacity-70">Dispositivo</label>
            <input
              name="dispositivoId"
              defaultValue={getVal("dispositivoId")}
              placeholder="TABLET-01"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium opacity-70">Bodega</label>
            <input
              name="bodega"
              defaultValue={getVal("bodega")}
              placeholder="BODEGA 1"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium opacity-70">Desde (ISO)</label>
            <input
              name="from"
              defaultValue={getVal("from")}
              placeholder="2025-12-25T00:00:00.000Z"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium opacity-70">Hasta (ISO)</label>
            <input
              name="to"
              defaultValue={getVal("to")}
              placeholder="2025-12-26T23:59:59.999Z"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
              <input type="checkbox" name="hoy" value="1" defaultChecked={getVal("hoy") === "1"} />
              Hoy
            </label>

            <label className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
              <input
                type="checkbox"
                name="salidaSinEntrada"
                value="1"
                defaultChecked={getVal("salidaSinEntrada") === "1"}
              />
              Salida sin entrada
            </label>
          </div>

          <div className="flex items-end justify-end gap-2 md:col-span-6">
            <Link href="/registros" className="rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:shadow">
              Limpiar
            </Link>

            <input type="hidden" name="limit" value={getVal("limit") || "50"} />
            <input type="hidden" name="offset" value="0" />

            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      </form>

      {/* Acciones (EXPORT) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-600">Exporta respetando los filtros actuales.</div>
        <div className="flex gap-2">
          <a href={exportXlsx} className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:shadow">
            Exportar Excel
          </a>
          <a href={exportPdf} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95">
            Exportar PDF
          </a>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Categoría</th>
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Empleado</th>
                <th className="px-4 py-3 font-semibold">Empresa</th>
                <th className="px-4 py-3 font-semibold">Bodega</th>
                <th className="px-4 py-3 font-semibold">Placa</th>
                <th className="px-4 py-3 font-semibold">Dispositivo</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm opacity-70" colSpan={9}>
                    No hay registros con esos filtros.
                  </td>
                </tr>
              ) : (
                data.items.map((it) => (
                  <tr key={it.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 whitespace-nowrap">{fmtDate(it.fechaHora)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge>{it.tipo}</Badge>
                        {it.salidaSinEntrada ? <Badge>⚠ SIN ENTRADA</Badge> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge>{it.categoria}</Badge>
                    </td>
                    <td className="px-4 py-3">{it.nombre ?? "-"}</td>
                    <td className="px-4 py-3">{it.noEmpleado ?? "-"}</td>
                    <td className="px-4 py-3">{it.empresa ?? "-"}</td>
                    <td className="px-4 py-3">{it.bodega ?? "-"}</td>
                    <td className="px-4 py-3">{it.placa ?? "-"}</td>
                    <td className="px-4 py-3">{it.dispositivoId}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between border-t bg-white px-4 py-3">
          <div className="text-xs opacity-70">
            Mostrando {Math.min(total, offset + 1)} - {Math.min(total, offset + limit)} de {total}
          </div>

          <div className="flex gap-2">
            <Link
              href={makeLink({ offset: String(prevOffset) })}
              aria-disabled={offset === 0}
              className={`rounded-xl border px-3 py-2 text-sm font-medium shadow-sm ${
                offset === 0 ? "pointer-events-none opacity-50" : "hover:shadow"
              }`}
            >
              ← Anterior
            </Link>

            <Link
              href={makeLink({ offset: String(nextOffset) })}
              aria-disabled={nextOffset >= total}
              className={`rounded-xl border px-3 py-2 text-sm font-medium shadow-sm ${
                nextOffset >= total ? "pointer-events-none opacity-50" : "hover:shadow"
              }`}
            >
              Siguiente →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
