import { describe, expect, it } from 'vitest'
import { normalizeEmployeeNumber } from './barcodeScannerService'

describe('normalizeEmployeeNumber', () => {
  it('conserva únicamente los dígitos del código leído', () => {
    expect(normalizeEmployeeNumber(' EMP-00123 ')).toBe('123')
  })

  it('rechaza códigos sin número de empleado', () => {
    expect(() => normalizeEmployeeNumber('EMPLEADO')).toThrow(
      'El código leído no contiene un número de empleado válido.'
    )
  })
})
