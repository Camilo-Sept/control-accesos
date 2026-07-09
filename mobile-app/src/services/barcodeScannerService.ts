import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning'

export class ScannerPermissionError extends Error {
  constructor(
    message = 'Debes permitir acceso a la cámara para escanear. Si ya la negaste, ve a Ajustes y habilítala para esta app.'
  ) {
    super(message)
    this.name = 'ScannerPermissionError'
  }
}

export class ScannerUnavailableError extends Error {
  constructor(message = 'El lector de códigos no está disponible en este dispositivo.') {
    super(message)
    this.name = 'ScannerUnavailableError'
  }
}

export function normalizeEmployeeNumber(raw: string): string {
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

function hasGrantedCameraPermission(permission: { camera?: string | null }): boolean {
  return permission.camera === 'granted' || permission.camera === 'limited'
}

async function ensureScannerSupported(): Promise<void> {
  const { supported } = await BarcodeScanner.isSupported()

  if (!supported) {
    throw new ScannerUnavailableError(
      'El lector de código/QR no está disponible en este dispositivo.'
    )
  }
}

async function ensureCameraPermission(): Promise<void> {
  try {
    const permission = await BarcodeScanner.requestPermissions()

    if (!hasGrantedCameraPermission(permission)) {
      throw new ScannerPermissionError()
    }
  } catch (error) {
    if (error instanceof ScannerPermissionError) {
      throw error
    }

    if (error instanceof Error && error.message.trim()) {
      throw new Error(`No se pudo validar el permiso de cámara: ${error.message}`)
    }

    throw new Error('No se pudo validar el permiso para usar la cámara.')
  }
}

async function scanSingleValue(formats: BarcodeFormat[]): Promise<string> {
  await ensureScannerSupported()
  await ensureCameraPermission()

  const result = await BarcodeScanner.scan({
    autoZoom: true,
    formats,
  })

  const barcode = result.barcodes?.[0]

  if (!barcode) {
    throw new Error('No se detectó ningún código. Intenta acercarte más y evita reflejos.')
  }

  const rawValue = (barcode.rawValue || barcode.displayValue || '').trim()

  if (!rawValue) {
    throw new Error('No se pudo leer el valor del código escaneado.')
  }

  return rawValue
}

export const barcodeScannerService = {
  async scanEmployeeNumber(): Promise<string> {
    const rawValue = await scanSingleValue([
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
    ])

    return normalizeEmployeeNumber(rawValue)
  },

  async scanQrContent(): Promise<string> {
    return scanSingleValue([BarcodeFormat.QrCode])
  },
}
