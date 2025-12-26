import Link from "next/link";
import { apiGet } from "@/lib/api";

type Stats = {
  dentro: number;
  entradasHoy: number;
  salidasHoy: number;
  salidasSinEntradaHoy: number;
  tabletsActivas: number;
  pendientesSync: number;
  asOf: string;
};

function CardLink({
  title,
  value,
  href,
  hint,
}: {
  title: string;
  value: number;
  href?: string;
  hint?: string;
}) {
  const inner = (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <p className="text-sm text-slate-600">{title}</p>
      <p className="mt-2 text-4xl font-semibold tabular-nums text-slate-900">
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-xs text-slate-500">{hint}</p>
      ) : (
        <p className="mt-2 text-xs text-slate-400">Ver detalles →</p>
      )}
    </div>
  );

  return href ? (
    <Link href={href} className="block focus:outline-none focus:ring-2 focus:ring-blue-500/40 rounded-2xl">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default async function DashboardPage() {
  const stats = await apiGet<Stats>("/dashboard/stats");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-sky-500 p-6 text-white shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Panel de supervisión</h1>
              <p className="text-sm text-white/80">
                Resumen operativo · Actualizado:{" "}
                <span className="font-semibold">{fmtDate(stats.asOf)}</span>
              </p>
            </div>

            <Link
              href="/registros"
              className="inline-flex items-center justify-center rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/15"
            >
              Ver todos los registros →
            </Link>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <CardLink
            title="Entradas hoy"
            value={stats.entradasHoy}
            href="/registros?tipo=ENTRADA&hoy=1"
          />
          <CardLink
            title="Salidas hoy"
            value={stats.salidasHoy}
            href="/registros?tipo=SALIDA&hoy=1"
          />
          <CardLink
            title="Salidas sin entrada (hoy)"
            value={stats.salidasSinEntradaHoy}
            href="/registros?tipo=SALIDA&salidaSinEntrada=1&hoy=1"
            hint="Casos para auditoría"
          />
          <CardLink
            title="Tablets activas"
            value={stats.tabletsActivas}
            href="/registros?hoy=1"
            hint="Actividad por dispositivo"
          />
          <CardLink
            title="Pendientes sync"
            value={stats.pendientesSync}
            href="/registros?hoy=1"
            hint="Eventos por revisar"
          />
          <CardLink
            title="Dentro"
            value={stats.dentro}
            href="/registros?hoy=1"
            hint="Mejoraremos este cálculo después"
          />
        </div>
      </div>
    </div>
  );
}
