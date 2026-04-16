import Link from "next/link";
import { apiGet } from "@/lib/api";

type Stats = {
  dentro: number | string;
  entradasHoy: number | string;
  salidasHoy: number | string;
  salidasSinEntradaHoy: number | string;
  tabletsActivas: number | string;
  pendientesSync: number | string;
};

function toNumber(v: number | string | null | undefined) {
  const n = typeof v === "string" ? Number(v) : v ?? 0;
  return Number.isFinite(n) ? n : 0;
}

function Card({
  title,
  value,
  href,
}: {
  title: string;
  value: number | string;
  href?: string;
}) {
  const content = (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow">
      <div className="text-sm font-medium text-slate-600">{title}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-900">
        {toNumber(value)}
      </div>
      {href ? (
        <div className="mt-3 text-sm font-medium text-blue-600">
          Ver detalles →
        </div>
      ) : null}
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

export default async function DashboardPage() {
  const stats = await apiGet<Stats>("/dashboard/stats");

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500">Estadísticas del sistema</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title="Dentro" value={stats.dentro} href="/registros?tipo=ENTRADA" />
        <Card title="Entradas hoy" value={stats.entradasHoy} href="/registros?hoy=1&tipo=ENTRADA" />
        <Card title="Salidas hoy" value={stats.salidasHoy} href="/registros?hoy=1&tipo=SALIDA" />

        <Card
          title="Salidas sin entrada"
          value={stats.salidasSinEntradaHoy}  
          href="/registros?tipo=SALIDA&salidaSinEntrada=1"
        />

        <Card title="Tablets activas" value={stats.tabletsActivas} />
        <Card title="Pendientes sync" value={stats.pendientesSync} />
      </div>

    
    </div>
  );
}
