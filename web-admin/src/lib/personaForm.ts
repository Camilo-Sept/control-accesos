import type { PersonaCatalogos } from '@/types/persona'

export const CUSTOM_OPTION_VALUE = '__CUSTOM__'

export const DEFAULT_AREAS = [
  'SEGURIDAD',
  'ALMACEN',
  'DIRECCION',
  'RH',
  'GERENCIA',
  'ADUANAS',
  'CONTABILIDAD Y FINANZAS',
  'MANTENIMIENTO',
]

export const DEFAULT_BODEGAS = [
  'WAREHOUSE 1',
  'WAREHOUSE 2',
  'WAREHOUSE 3',
  'WAREHOUSE 4',
  'WAREHOUSE 5',
  'WAREHOUSE 6',
  'WAREHOUSE 10',
  'WAREHOUSE 11',
]

export function toUpperInput(value: string): string {
  return value.toUpperCase()
}

export function toNullable(value: string): string | null {
  const normalized = value.trim()
  return normalized === '' ? null : normalized
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10)
}

export function getEmailError(value: string): string | null {
  const normalized = value.trim()
  if (!normalized) return null

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  return isValid ? null : 'Ingresa un correo válido.'
}

export function getPhoneError(value: string): string | null {
  if (!value.trim()) return null
  return normalizePhone(value).length === 10 ? null : 'El teléfono debe tener 10 dígitos.'
}

function uniqueUpperOptions(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const raw of values) {
    const normalized = raw.trim().toUpperCase()
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
  }

  return result
}

export function buildPersonaCatalogs(catalogos: PersonaCatalogos) {
  return {
    empresas: uniqueUpperOptions(catalogos.empresas ?? []),
    areas: uniqueUpperOptions([...DEFAULT_AREAS, ...(catalogos.areas ?? [])]),
    bodegas: uniqueUpperOptions([...DEFAULT_BODEGAS, ...(catalogos.bodegas ?? [])]),
  }
}

export function isCustomOption(value: string, options: string[]): boolean {
  const normalized = value.trim().toUpperCase()
  if (!normalized) return false
  return !options.includes(normalized)
}