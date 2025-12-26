import Link from "next/link";
import { cleanSearchParams } from "@/lib/cleanSearchParams";

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

const API = process.env.NEXT_PUBLIC_API_BASE_URL!;

function withParams(
  basePath: string,
  sp: URLSearchParams,
  patch: Record<string, string | null>
) {
  const next = new URLSearchParams(sp.toString());
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) next.delete(k);
    else next.set(k, v);
  }
  const qs = next.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default async function RegistrosPage({ searchParams }: PageProps) {
  // ✅ Limpia params vacíos: q=, tipo=, etc.
  const sp = cleanSearchParams(searchParams);

  // defaults
  const limit = Number(sp.get("limit") ?? "50");
  const offset = Number(sp.get("offset") ?? "0");

  // Normaliza (por si venían raros)
  if (!sp.get("limit")) sp.set("limit", String(isFinite(limit) ? limit : 50));
  if (!sp.get("offset")) sp.set("offset", String(isFinite(offset) ? offset : 0));

  const query = sp.toString();
  const url = `${API}/registros?${query}`;

  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) {
    throw new Error(`Error cargando registros (${resp.status})`);
  }

  const data: {
    total: number;
    limit: number;
    offset: number;
    items: Array<{
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
      fechaHora: string;
      dispositivoId: string;
      salidaSinEntrada: boolean;
    }>;
  } = await resp.json();

  // ✅ Export con filtros activos (ya limpios)
  const exportXlsxUrl = `${API}/registros/export.xlsx?${query}`;
  const exportPdfUrl = `${API}/registros/export.pdf?${query}`;

  const q = sp.get("q") ?? "";
  const tipo = sp.get("tipo") ?? "";
  const categoria = sp.get("categoria") ?? "";
  const dispositivoId = sp.get("dispositivoId") ?? "";
  const bodega = sp.get("bodega") ?? "";
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  const hoy = sp.get("hoy") === "1" || sp.get("hoy") === "true";
  const salidaSinEntrada =
    sp.get("salidaSinEntrada") === "1" || sp.get("salidaSinEntrada") === "true";

  const hasPrev = data.offset > 0;
  const hasNext = data.offset + data.limit < data.total;

  const prevOffset = Math.max(0, data.offset - data.limit);
  const nextOffset = data.offset + data.limit;

  const prevHref = withParams("/registros", sp, { offset: String(prevOffset) });
  const nextHref = withParams("/registros", sp, { offset: String(nextOffset) });

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Registros</h1>
          <p className="text-sm text-slate-500">
            Total: <span className="font-medium text-slate-900">{data.total}</span>
          </p>
        </div>

        {/* ✅ UN SOLO BLOQUE DE EXPORT (sin duplicados) */}
        <div className="flex gap-2">
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

      {/* Filtros (GET) */}
      <form
        action="/registros"
        method="get"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        {/* Reinicia offset al aplicar filtros */}
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
              name="from"
              defaultValue={from}
              placeholder="2025-12-26T00:00:00.000Z"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Hasta</label>
            <input
              name="to"
              defaultValue={to}
              placeholder="2025-12-26T23:59:59.999Z"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 md:col-span-2">
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

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Fecha</th>
              <th className="px-4 py-3 text-left font-medium">Tipo</th>
              <th className="px-4 py-3 text-left font-medium">Categoría</th>
              <th className="px-4 py-3 text-left font-medium">Nombre</th>
              <th className="px-4 py-3 text-left font-medium">Bodega</th>
              <th className="px-4 py-3 text-left font-medium">Placa</th>
              <th className="px-4 py-3 text-left font-medium">Dispositivo</th>
              <th className="px-4 py-3 text-left font-medium">Auditoría</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((it) => (
              <tr key={it.id} className="border-t border-slate-100">
                <td className="px-4 py-3 whitespace-nowrap">{it.fechaHora}</td>
                <td className="px-4 py-3">{it.tipo}</td>
                <td className="px-4 py-3">{it.categoria}</td>
                <td className="px-4 py-3">{it.nombre ?? "-"}</td>
                <td className="px-4 py-3">{it.bodega ?? "-"}</td>
                <td className="px-4 py-3">{it.placa ?? "-"}</td>
                <td className="px-4 py-3">{it.dispositivoId}</td>
                <td className="px-4 py-3">
                  {it.salidaSinEntrada ? (
                    <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                      SALIDA SIN ENTRADA
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {data.items.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={8}>
                  No hay registros con los filtros actuales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Mostrando{" "}
          <span className="font-medium text-slate-900">
            {data.items.length ? data.offset + 1 : 0}
          </span>{" "}
          -{" "}
          <span className="font-medium text-slate-900">
            {Math.min(data.offset + data.items.length, data.total)}
          </span>{" "}
          de <span className="font-medium text-slate-900">{data.total}</span>
        </div>

        <div className="flex gap-2">
          <Link
            href={hasPrev ? prevHref : "#"}
            aria-disabled={!hasPrev}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              hasPrev
                ? "border-slate-200 bg-white hover:bg-slate-50"
                : "border-slate-100 bg-slate-50 text-slate-400 pointer-events-none"
            }`}
          >
            Anterior
          </Link>
          <Link
            href={hasNext ? nextHref : "#"}
            aria-disabled={!hasNext}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              hasNext
                ? "border-slate-200 bg-white hover:bg-slate-50"
                : "border-slate-100 bg-slate-50 text-slate-400 pointer-events-none"
            }`}
          >
            Siguiente
          </Link>
        </div>
      </div>
    </div>
  );
}
