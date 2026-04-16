'use client'

import { useMemo, useState } from 'react'
import QRCode from 'react-qr-code'
import { SectionHeader } from '@/components/SectionHeader'

type TipoQR = 'E' | 'V'
type TamanoQR = 'CHICO' | 'MEDIANO' | 'GRANDE'

export default function QRPage() {
  const [tipoQR, setTipoQR] = useState<TipoQR>('E')
  const [tamanoQR, setTamanoQR] = useState<TamanoQR>('MEDIANO')

  const [noEmpleado, setNoEmpleado] = useState('')
  const [nombre, setNombre] = useState('')
  const [placas, setPlacas] = useState('')
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const qrPayload = useMemo(() => {
    const noEmp = noEmpleado.trim().toUpperCase()
    const nom = nombre.trim().toUpperCase()
    const plc = placas.trim().toUpperCase()

    if (!noEmp || !nom) return ''

    if (tipoQR === 'E') {
      return `IMPULSO|1|E|${noEmp}|${nom}`
    }

    if (!plc) return ''
    return `IMPULSO|1|V|${noEmp}|${nom}|${plc}`
  }, [tipoQR, noEmpleado, nombre, placas])

  const qrSizePx = useMemo(() => {
    switch (tamanoQR) {
      case 'CHICO':
        return 120
      case 'MEDIANO':
        return 200
      case 'GRANDE':
        return 320
      default:
        return 200
    }
  }, [tamanoQR])

  const handleGenerar = () => {
    setMensaje(null)
    setError(null)

    const noEmp = noEmpleado.trim().toUpperCase()
    const nom = nombre.trim().toUpperCase()
    const plc = placas.trim().toUpperCase()

    if (!noEmp) {
      setError('El No. de empleado es obligatorio.')
      return
    }
    if (!nom) {
      setError('El nombre es obligatorio.')
      return
    }
    if (tipoQR === 'V' && !plc) {
      setError('Las placas son obligatorias para QR de vehículo.')
      return
    }
    if (!qrPayload) {
      setError('No se pudo generar el contenido del QR.')
      return
    }

    setMensaje('QR generado correctamente. Puedes imprimirlo.')
  }

  const handleLimpiar = () => {
    setNoEmpleado('')
    setNombre('')
    setPlacas('')
    setMensaje(null)
    setError(null)
  }

  const handleImprimir = () => {
    if (!qrPayload) return

    const qrElement = document.getElementById('qr-print-area')
    if (!qrElement) return

    const svgHtml = qrElement.innerHTML

    let sizeCm = '4cm'
    if (tamanoQR === 'CHICO') sizeCm = '2cm'
    if (tamanoQR === 'MEDIANO') sizeCm = '4cm'
    if (tamanoQR === 'GRANDE') sizeCm = '12cm'

    const printWindow = window.open('', '_blank', 'width=600,height=600')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR IMPULSO</title>
          <style>
            @page {
              margin: 10mm;
            }
            body {
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              background: #ffffff;
            }
            .qr-wrapper {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 8mm;
              border: 1px solid #888;
              border-radius: 8px;
            }
            .qr-box {
              width: ${sizeCm};
              height: ${sizeCm};
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .qr-box svg {
              width: 100%;
              height: 100%;
            }
            .info {
              margin-top: 4mm;
              font-size: 10pt;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="qr-wrapper">
            <div class="qr-box">
              ${svgHtml}
            </div>
            <div class="info">
              <div><strong>${nombre.trim().toUpperCase() || ''}</strong></div>
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

  const descripcionTamano = (t: TamanoQR): string => {
    switch (t) {
      case 'CHICO':
        return 'Gafete / llavero (aprox 2×2 cm)'
      case 'MEDIANO':
        return 'Tarjeta / gafete grande (aprox 4×4 cm)'
      case 'GRANDE':
        return 'Para parabrisas / carro (más grande)'
      default:
        return ''
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <SectionHeader
        title="Generador QR"
        description="Genera QR para empleados con el formato que la tablet sabe leer."
        actions={[
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/personas', label: 'Personas' },
        ]}
      />

      <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-center rounded-t-2xl bg-blue-600 px-4 py-3">
          <h1 className="text-lg font-bold tracking-wide text-white md:text-xl">
            CONTROL DE ACCESOS · GENERADOR QR
          </h1>
        </div>

        <div className="p-4 md:p-6">
          <div className="mb-4">
            <p className="text-center text-sm text-slate-600 md:text-base">
              Genera QR para empleados con el formato que la tablet sabe leer.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 shadow-sm">
                <div className="rounded-t-xl border-b border-slate-200 bg-slate-50 px-4 py-2">
                  <h2 className="text-sm font-semibold text-slate-700">Tipo de QR</h2>
                </div>
                <div className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTipoQR('E')}
                      className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold ${
                        tipoQR === 'E'
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      EMPLEADO A PIE
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoQR('V')}
                      className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold ${
                        tipoQR === 'V'
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      EMPLEADO EN VEHÍCULO
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    A pie: solo empleado. Vehículo: empleado + placas.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 shadow-sm">
                <div className="rounded-t-xl border-b border-slate-200 bg-slate-50 px-4 py-2">
                  <h2 className="text-sm font-semibold text-slate-700">Datos del empleado</h2>
                </div>

                <div className="space-y-3 px-4 py-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        No. de empleado <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={noEmpleado}
                        onChange={(e) => setNoEmpleado(e.target.value.toUpperCase())}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="EJ. 12345"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Tamaño QR
                      </label>
                      <select
                        value={tamanoQR}
                        onChange={(e) => setTamanoQR(e.target.value as TamanoQR)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="CHICO">CHICO</option>
                        <option value="MEDIANO">MEDIANO</option>
                        <option value="GRANDE">GRANDE</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Nombre <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value.toUpperCase())}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="NOMBRE COMPLETO"
                    />
                  </div>

                  {tipoQR === 'V' && (
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Placas <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={placas}
                        onChange={(e) => setPlacas(e.target.value.toUpperCase())}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="ABC123A"
                      />
                    </div>
                  )}

                  <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    <div className="font-semibold text-slate-700">Uso sugerido</div>
                    <div className="mt-1">{descripcionTamano(tamanoQR)}</div>
                  </div>

                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  {mensaje && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      {mensaje}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleGenerar}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Generar QR
                    </button>

                    <button
                      type="button"
                      onClick={handleImprimir}
                      disabled={!qrPayload}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Imprimir
                    </button>

                    <button
                      type="button"
                      onClick={handleLimpiar}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 shadow-sm">
                <div className="rounded-t-xl border-b border-slate-200 bg-slate-50 px-4 py-2">
                  <h2 className="text-sm font-semibold text-slate-700">Vista previa</h2>
                </div>

                <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 px-4 py-6">
                  {qrPayload ? (
                    <>
                      <div
                        id="qr-print-area"
                        className="rounded-xl border border-slate-200 bg-white p-4"
                      >
                        <QRCode value={qrPayload} size={qrSizePx} />
                      </div>

                      <div className="space-y-1 text-center">
                        <p className="text-base font-semibold text-slate-900">
                          {nombre.trim().toUpperCase() || 'SIN NOMBRE'}
                        </p>
                        <p className="text-sm text-slate-600">
                          {noEmpleado.trim().toUpperCase() || 'SIN NÚMERO'}
                        </p>
                        {tipoQR === 'V' && placas.trim() ? (
                          <p className="text-sm text-slate-600">
                            PLACAS: {placas.trim().toUpperCase()}
                          </p>
                        ) : null}
                      </div>

                      <div className="w-full rounded-lg bg-slate-50 p-3">
                        <p className="mb-1 text-xs font-semibold text-slate-700">Payload</p>
                        <p className="break-all text-xs text-slate-600">{qrPayload}</p>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2 text-center">
                      <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
                        QR SIN GENERAR
                      </div>
                      <p className="text-sm text-slate-500">
                        Captura los datos y genera el QR para ver la vista previa.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}