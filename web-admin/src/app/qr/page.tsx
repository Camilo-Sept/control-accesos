'use client';

import { useMemo, useState } from 'react';
import QRCode from 'react-qr-code';

type TipoQR = 'E' | 'V'; // E = empleado a pie, V = empleado en vehículo
type TamanoQR = 'CHICO' | 'MEDIANO' | 'GRANDE';

export default function QRPage() {
  const [tipoQR, setTipoQR] = useState<TipoQR>('E');
  const [tamanoQR, setTamanoQR] = useState<TamanoQR>('MEDIANO');

  const [noEmpleado, setNoEmpleado] = useState('');
  const [nombre, setNombre] = useState('');
  const [placas, setPlacas] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Contenido que va a leer la tablet
  const qrPayload = useMemo(() => {
    const noEmp = noEmpleado.trim().toUpperCase();
    const nom = nombre.trim().toUpperCase();
    const plc = placas.trim().toUpperCase();

    if (!noEmp || !nom) return '';

    if (tipoQR === 'E') {
      return `IMPULSO|1|E|${noEmp}|${nom}`;
    }

    if (!plc) return '';
    return `IMPULSO|1|V|${noEmp}|${nom}|${plc}`;
  }, [tipoQR, noEmpleado, nombre, placas]);

  // Tamaño en px para pantalla
  const qrSizePx = useMemo(() => {
    switch (tamanoQR) {
      case 'CHICO':
        return 120;
      case 'MEDIANO':
        return 200;
      case 'GRANDE':
        return 320;
      default:
        return 200;
    }
  }, [tamanoQR]);

  const handleGenerar = () => {
    setMensaje(null);
    setError(null);

    const noEmp = noEmpleado.trim().toUpperCase();
    const nom = nombre.trim().toUpperCase();
    const plc = placas.trim().toUpperCase();

    if (!noEmp) {
      setError('El No. de empleado es obligatorio.');
      return;
    }
    if (!nom) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (tipoQR === 'V' && !plc) {
      setError('Las placas son obligatorias para QR de vehículo.');
      return;
    }
    if (!qrPayload) {
      setError('No se pudo generar el contenido del QR.');
      return;
    }

    setMensaje('QR generado correctamente. Puedes imprimirlo.');
  };

  const handleLimpiar = () => {
    setNoEmpleado('');
    setNombre('');
    setPlacas('');
    setMensaje(null);
    setError(null);
  };

  // Imprimir SOLO QR + nombre en una ventanita
  const handleImprimir = () => {
    if (!qrPayload) return;

    const qrElement = document.getElementById('qr-print-area');
    if (!qrElement) return;

    const svgHtml = qrElement.innerHTML;

    // Tamaño físico aproximado en cm para impresión
    let sizeCm = '4cm';
    if (tamanoQR === 'CHICO') sizeCm = '2cm';
    if (tamanoQR === 'MEDIANO') sizeCm = '4cm';
    if (tamanoQR === 'GRANDE') sizeCm = '12cm';

    const printWindow = window.open('', '_blank', 'width=600,height=600');
    if (!printWindow) return;

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
              font-family: system-ui, -apple-system, BlinkMacSystemFont,
                "Segoe UI", sans-serif;
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
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const descripcionTamano = (t: TamanoQR): string => {
    switch (t) {
      case 'CHICO':
        return 'Gafete / llavero (aprox 2×2 cm)';
      case 'MEDIANO':
        return 'Tarjeta / gafete grande (aprox 4×4 cm)';
      case 'GRANDE':
        return 'Para parabrisas / carro (más grande)';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200">
        {/* Header tipo app móvil */}
        <div className="bg-blue-600 rounded-t-2xl px-4 py-3 flex items-center justify-center">
          <h1 className="text-lg md:text-xl font-bold text-white tracking-wide">
            CONTROL DE ACCESOS · GENERADOR QR
          </h1>
        </div>

        <div className="p-4 md:p-6">
          <div className="mb-4">
            <p className="text-sm md:text-base text-slate-600 text-center">
              Genera QR para empleados con el formato que la tablet sabe leer.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* FORMULARIO */}
            <div className="space-y-4">
              {/* Tipo de QR */}
              <div className="border border-slate-200 rounded-xl shadow-sm">
                <div className="border-b border-slate-200 px-4 py-2 bg-slate-50 rounded-t-xl">
                  <h2 className="text-sm font-semibold text-slate-700">
                    Tipo de QR
                  </h2>
                </div>
                <div className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTipoQR('E')}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border ${
                        tipoQR === 'E'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      EMPLEADO A PIE
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoQR('V')}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border ${
                        tipoQR === 'V'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-300'
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

              {/* Datos del empleado */}
              <div className="border border-slate-200 rounded-xl shadow-sm">
                <div className="border-b border-slate-200 px-4 py-2 bg-slate-50 rounded-t-xl">
                  <h2 className="text-sm font-semibold text-slate-700">
                    Datos del empleado
                  </h2>
                </div>
                <div className="px-4 py-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        No. de empleado <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={noEmpleado}
                        onChange={(e) =>
                          setNoEmpleado(e.target.value.toUpperCase())
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="EJ. 12345"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nombre completo{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={nombre}
                        onChange={(e) =>
                          setNombre(e.target.value.toUpperCase())
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="EJ. JUAN PEREZ"
                      />
                    </div>
                  </div>

                  {tipoQR === 'V' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Placas <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={placas}
                        onChange={(e) =>
                          setPlacas(e.target.value.toUpperCase())
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="EJ. ABC123"
                      />
                    </div>
                  )}

                  <p className="text-xs text-slate-500">
                    Los datos se convierten a MAYÚSCULAS para que coincidan con
                    lo que espera la tablet.
                  </p>
                </div>
              </div>

              {/* Tamaño */}
              <div className="border border-slate-200 rounded-xl shadow-sm">
                <div className="border-b border-slate-200 px-4 py-2 bg-slate-50 rounded-t-xl">
                  <h2 className="text-sm font-semibold text-slate-700">
                    Tamaño para imprimir
                  </h2>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTamanoQR('CHICO')}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border ${
                        tamanoQR === 'CHICO'
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      CHICO
                    </button>
                    <button
                      type="button"
                      onClick={() => setTamanoQR('MEDIANO')}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border ${
                        tamanoQR === 'MEDIANO'
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      MEDIANO
                    </button>
                    <button
                      type="button"
                      onClick={() => setTamanoQR('GRANDE')}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border ${
                        tamanoQR === 'GRANDE'
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      GRANDE
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    {descripcionTamano(tamanoQR)}
                  </p>
                </div>
              </div>

              {error && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </div>
              )}
              {mensaje && (
                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                  {mensaje}
                </div>
              )}

              <div className="flex gap-3 mt-1">
                <button
                  type="button"
                  onClick={handleGenerar}
                  className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                >
                  GENERAR QR
                </button>
                <button
                  type="button"
                  onClick={handleLimpiar}
                  className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition"
                >
                  LIMPIAR
                </button>
              </div>
            </div>

            {/* QR + botón imprimir */}
            <div className="flex flex-col items-center gap-3">
              <div className="border border-slate-200 rounded-xl shadow-sm w-full h-full flex flex-col items-center justify-between p-4">
                <h2 className="text-sm font-semibold text-slate-700 mb-2">
                  Vista previa
                </h2>

                <div
                  id="qr-print-area"
                  className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col items-center justify-center gap-2"
                >
                  {qrPayload ? (
                    <>
                      <QRCode
                        value={qrPayload}
                        size={qrSizePx}
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                      {/* Aquí solo mostramos el NOMBRE debajo del QR */}
                      {nombre.trim() && (
                        <div className="mt-2 text-sm font-semibold text-slate-800 text-center">
                          {nombre.trim().toUpperCase()}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-[200px] h-[200px] flex items-center justify-center text-xs text-slate-400 text-center px-4">
                      Completa los datos y presiona
                      <br />
                      <strong>&quot;GENERAR QR&quot;</strong>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!qrPayload}
                  onClick={handleImprimir}
                  className={`mt-3 px-4 py-2 text-sm font-semibold rounded-lg border transition ${
                    qrPayload
                      ? 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600'
                      : 'bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed'
                  }`}
                >
                  IMPRIMIR SOLO EL QR
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
