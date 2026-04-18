import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning'

function normalizeEmployeeNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').trim()

  if (!digits) {
    throw new Error('El código leído no contiene un número de empleado válido.')
  }

  try {
    return BigInt(digits).toString()
  } catch {
    return digits.replace(/^0+(?=\d)/, '') || digits
  }
}

export const barcodeScannerService = {
  async scanEmployeeNumber(): Promise<string> {
    const { supported } = await BarcodeScanner.isSupported()

    if (!supported) {
      throw new Error('El lector de código de barras no está disponible en este dispositivo.')
    }

    try {
      const permission = await BarcodeScanner.requestPermissions()

      if (
        permission.camera !== 'granted' &&
        permission.camera !== 'limited'
      ) {
        throw new Error('Debes permitir acceso a la cámara para escanear el código de barras.')
      }
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        throw error
      }

      throw new Error('No se pudo solicitar permiso para usar la cámara.')
    }

    const result = await BarcodeScanner.scan({
      autoZoom: true,
      formats: [
        BarcodeFormat.Code128,
        BarcodeFormat.Code39,
        BarcodeFormat.Code93,
        BarcodeFormat.Codabar,
        BarcodeFormat.Ean8,
        BarcodeFormat.Ean13,
        BarcodeFormat.UpcA,
        BarcodeFormat.UpcE,
        BarcodeFormat.Itf,
        BarcodeFormat.Pdf417,
      ],
    })

    const barcode = result.barcodes?.[0]

    if (!barcode) {
      throw new Error('No se detectó ningún código de barras.')
    }

    const rawValue = (barcode.rawValue || barcode.displayValue || '').trim()

    if (!rawValue) {
      throw new Error('No se pudo leer el valor del código de barras.')
    }

    return normalizeEmployeeNumber(rawValue)
  },
}