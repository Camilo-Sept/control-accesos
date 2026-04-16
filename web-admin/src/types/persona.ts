export type TipoPersona = 'EMPLEADO' | 'VISITANTE' | 'PROVEEDOR' | 'CONTRATISTA'

export type Persona = {
  id: string
  nombre: string
  noEmpleado: string | null
  empresa: string | null
  area: string | null
  bodega: string | null
  tipoPersona: TipoPersona
  activo: boolean
  qrValue: string | null
  telefono: string | null
  email: string | null
  notas: string | null
  createdAt: string
  updatedAt: string
}

export type PersonasResponse = {
  total: number
  limit: number
  offset: number
  items: Persona[]
}

export type PersonaCreateInput = {
  nombre: string
  noEmpleado: string | null
  empresa: string | null
  area: string | null
  bodega: string | null
  tipoPersona: TipoPersona
  activo: boolean
  qrValue: string | null
  telefono: string | null
  email: string | null
  notas: string | null
}

export type PersonaCatalogos = {
  empresas: string[]
  areas: string[]
  bodegas: string[]
}