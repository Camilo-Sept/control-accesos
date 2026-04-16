'use client'

import { useMemo } from 'react'
import QRCode from 'react-qr-code'
import type { Persona } from '@/types/persona'

type PersonaQrPanelProps = {
  persona: Pick<Persona, 'id' | 'nombre' | 'noEmpleado' | 'empresa' | 'bodega' | 'qrValue'>
}

export default function PersonaQrPanel({ persona }: PersonaQrPanelProps) {
  const qrValue = persona.qrValue?.trim() ?? ''
  const printAreaId = useMemo(() => `persona-qr-${persona.id}`, [persona.id])

  const nombre = persona.nombre?.trim().toUpperCase() || 'SIN NOMBRE'
  const noEmpleado = persona.noEmpleado?.trim().toUpperCase() || 'SIN NÚMERO'
  const empresa = persona.empresa?.trim().toUpperCase() || '-'
  const bodega = persona.bodega?.trim().toUpperCase() || '-'

  function handlePrint() {
    if (!qrValue) return

    const qrElement = document.getElementById(printAreaId)
    if (!qrElement) return

    const svgHtml = qrElement.innerHTML

    const printWindow = window.open('', '_blank', 'width=700,height=700')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR PERSONA</title>
          <style>
            @page {
              margin: 12mm;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              background: #ffffff;
              color: #0f172a;
            }
            .page {
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 24px;
            }
            .card {
              width: 100%;
              max-width: 420px;
              border: 1px solid #cbd5e1;
              border-radius: 16px;
              padding: 24px;
              box-sizing: border-box;
              text-align: center;
            }
            .title {
              font-size: 18px;
              font-weight: 700;
              margin-bottom: 16px;
            }
            .qr-box {
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 16px;
            }
            .qr-box svg {
              width: 240px;
              height: 240px;
            }
            .name {
              font-size: 16px;
              font-weight: 700;
              margin-bottom: 6px;
            }
            .meta {
              font-size: 13px;
              margin-bottom: 4px;
            }
            .payload {
              margin-top: 16px;
              font-size: 11px;
              color: #475569;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="card">
              <div class="title">CONTROL DE ACCESOS · QR PERSONA</div>
              <div class="qr-box">${svgHtml}</div>
              <div class="name">${nombre}</div>
              <div class="meta">NO. EMPLEADO: ${noEmpleado}</div>
              <div class="meta">EMPRESA: ${empresa}</div>
              <div class="meta">BODEGA: ${bodega}</div>
              <div class="payload">${qrValue}</div>
            </div>
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }

  return (
    <section
      id="qr-panel"
      className="rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-semibold text-slate-900">QR de la persona</h2>
        <p className="mt-1 text-sm text-slate-500">
          Vista previa e impresión del código QR canónico ligado al registro.
        </p>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-5">
          {qrValue ? (
            <>
              <div
                id={printAreaId}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <QRCode value={qrValue} size={220} />
              </div>

              <div className="mt-4 space-y-1 text-center">
                <p className="text-base font-semibold text-slate-900">{nombre}</p>
                <p className="text-sm text-slate-600">{noEmpleado}</p>
              </div>
            </>
          ) : (
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-[220px] w-[220px] items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white text-sm text-slate-400">
                SIN QR DISPONIBLE
              </div>
              <p className="max-w-xs text-sm text-slate-500">
                Esta persona todavía no tiene QR canónico. Guarda el registro o corre la
                normalización del backend.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {!qrValue && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              No se puede imprimir todavía porque esta persona aún no tiene un QR válido.
            </div>
          )}

          <div className="rounded-2xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-700">Datos visibles</h3>
            </div>

            <div className="grid gap-3 px-4 py-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Nombre</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{nombre}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  No. empleado
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">{noEmpleado}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Empresa</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{empresa}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Bodega</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{bodega}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-700">Valor QR canónico</h3>
            </div>

            <div className="px-4 py-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="break-all text-sm text-slate-700">{qrValue || 'SIN QR'}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handlePrint}
              disabled={!qrValue}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Imprimir QR
            </button>

            <a
              href="/qr"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Generador manual
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}