import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Control de Accesos
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Panel para supervisores y gerentes
              </p>
            </div>

            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 ring-1 ring-blue-100">
              Web Admin
            </span>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Link
              href="/dashboard"
              className="group rounded-2xl bg-blue-600 px-5 py-5 text-white shadow-sm transition hover:opacity-95"
            >
              <div className="text-sm opacity-90">Ver resumen</div>
              <div className="mt-1 text-xl font-semibold">Dashboard</div>
              <div className="mt-2 text-sm opacity-90">
                KPIs: dentro, entradas, salidas, pendientes
              </div>
              <div className="mt-4 text-sm font-semibold">
                Entrar →
              </div>
            </Link>

            <Link
              href="/registros"
              className="group rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm transition hover:shadow"
            >
              <div className="text-sm text-slate-600">Consultar</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">
                Registros
              </div>
              <div className="mt-2 text-sm text-slate-600">
                Tabla con filtros por nombre, fecha, bodega, tablet, etc.
              </div>
              <div className="mt-4 text-sm font-semibold text-blue-700">
                Abrir →
              </div>
            </Link>

            <Link
              href="/registros?tipo=SALIDA&salidaSinEntrada=1"
              className="group rounded-2xl border border-red-200 bg-red-50 px-5 py-5 shadow-sm transition hover:shadow"
            >
              <div className="text-sm text-red-700">Alertas</div>
              <div className="mt-1 text-xl font-semibold text-red-900">
                Salidas sin entrada
              </div>
              <div className="mt-2 text-sm text-red-800/80">
                Casos para revisar inmediatamente
              </div>
              <div className="mt-4 text-sm font-semibold text-red-800">
                Revisar →
              </div>
            </Link>
          </div>

          <div className="mt-8 rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">
              Tips rápidos
            </h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              <li>• Usa “Registros” para buscar por nombre/placa o filtrar por fechas.</li>
              <li>• “Salidas sin entrada” te lleva directo a los casos anómalos.</li>
              <li>• Si no ves datos, revisa que el backend esté en <b>localhost:3001</b>.</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
