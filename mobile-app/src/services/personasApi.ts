import { API_BASE, TABLET_API_KEY } from './apiConfig'
import type { CategoriaPersona } from '../models/registro'

export type PersonaQrLookup = {
  id: string
  nombre: string
  noEmpleado: string | null
  empresa: string | null
  area: string | null
  bodega: string | null
  tipoPersona: 'EMPLEADO' | 'VISITANTE' | 'PROVEEDOR' | 'CONTRATISTA'
  activo: boolean
  qrValue: string
}

export function isCanonicalPersonaQr(value: string) {
  return value.trim().toUpperCase().startsWith('IMPULSO|2|PERSONA|')
}

export function mapTipoPersonaToCategoria(
  tipoPersona: PersonaQrLookup['tipoPersona']
): CategoriaPersona | null {
  switch (tipoPersona) {
    case 'EMPLEADO':
      return 'EMPLEADO'
    case 'PROVEEDOR':
      return 'PROVEEDOR'
    case 'VISITANTE':
      return 'VISITANTE'
    default:
      return null
  }
}

export async function buscarPersonaPorQr(value: string): Promise<PersonaQrLookup> {
  const qr = value.trim()
  if (!qr) {
    throw new Error('QR vacío')
  }

  const url = `${API_BASE}/personas/by-qr?value=${encodeURIComponent(qr)}`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'x-api-key': TABLET_API_KEY,
    },
  })

  if (res.status === 404) {
    throw new Error('No se encontró ninguna persona para ese QR.')
  }

  if (!res.ok) {
    throw new Error(`Error consultando QR: ${res.status}`)
  }

  return (await res.json()) as PersonaQrLookup
}