'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PersonaCatalogos, PersonaCreateInput, TipoPersona } from '@/types/persona'
import {
  buildPersonaCatalogs,
  CUSTOM_OPTION_VALUE,
  getEmailError,
  getEmployeeNumberError,
  getPhoneError,
  normalizeEmail,
  normalizeEmployeeNumber,
  normalizePhone,
  toNullable,
  toUpperInput,
} from '@/lib/personaForm'

const TIPOS_PERSONA: TipoPersona[] = ['EMPLEADO', 'VISITANTE', 'PROVEEDOR', 'CONTRATISTA']

type FormState = {
  nombre: string
  noEmpleado: string
  empresa: string
  area: string
  bodega: string
  tipoPersona: TipoPersona
  activo: boolean
  telefono: string
  email: string
  notas: string
}

type FieldErrors = {
  noEmpleado?: string
  email?: string
  telefono?: string
}

const INITIAL_STATE: FormState = {
  nombre: '',
  noEmpleado: '',
  empresa: '',
  area: '',
  bodega: '',
  tipoPersona: 'EMPLEADO',
  activo: true,
  telefono: '',
  email: '',
  notas: '',
}

function getApiErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return 'No se pudo crear la persona.'

  const error = 'error' in payload && typeof payload.error === 'string' ? payload.error : null
  if (error) return error

  return 'No se pudo crear la persona.'
}

export default function PersonaCreateForm({ catalogos }: { catalogos: PersonaCatalogos }) {
  const router = useRouter()

  const options = useMemo(() => buildPersonaCatalogs(catalogos), [catalogos])

  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [areaIsCustom, setAreaIsCustom] = useState(false)
  const [bodegaIsCustom, setBodegaIsCustom] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleAreaSelect(value: string) {
    if (value === CUSTOM_OPTION_VALUE) {
      setAreaIsCustom(true)
      updateField('area', '')
      return
    }

    setAreaIsCustom(false)
    updateField('area', value)
  }

  function handleBodegaSelect(value: string) {
    if (value === CUSTOM_OPTION_VALUE) {
      setBodegaIsCustom(true)
      updateField('bodega', '')
      return
    }

    setBodegaIsCustom(false)
    updateField('bodega', value)
  }

  function validateFields() {
    const nextErrors: FieldErrors = {}

    const noEmpleadoError = getEmployeeNumberError(form.noEmpleado)
    const emailError = getEmailError(form.email)
    const telefonoError = getPhoneError(form.telefono)

    if (noEmpleadoError) nextErrors.noEmpleado = noEmpleadoError
    if (emailError) nextErrors.email = emailError
    if (telefonoError) nextErrors.telefono = telefonoError

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function buildPayload(): PersonaCreateInput {
    return {
      nombre: toUpperInput(form.nombre).trim(),
      noEmpleado: toNullable(normalizeEmployeeNumber(form.noEmpleado)),
      empresa: toNullable(toUpperInput(form.empresa)),
      area: toNullable(toUpperInput(form.area)),
      bodega: toNullable(toUpperInput(form.bodega)),
      tipoPersona: form.tipoPersona,
      activo: form.activo,
      qrValue: null,
      telefono: toNullable(normalizePhone(form.telefono)),
      email: toNullable(normalizeEmail(form.email)),
      notas: toNullable(toUpperInput(form.notas)),
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setSuccess(null)
    setError(null)

    const payload = buildPayload()

    if (!payload.nombre) {
      setError('El nombre es obligatorio.')
      setSubmitting(false)
      return
    }

    if (!validateFields()) {
      setSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as unknown
        setError(getApiErrorMessage(data))
        setSubmitting(false)
        return
      }

      setForm(INITIAL_STATE)
      setAreaIsCustom(false)
      setBodegaIsCustom(false)
      setFieldErrors({})
      setSuccess('Persona creada correctamente. El QR se generó automáticamente.')
      router.refresh()
    } catch {
      setError('Ocurrió un error de red al crear la persona.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Alta de persona</h2>
        <p className="text-sm text-slate-500">Crea registros nuevos sin salir del catálogo.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <label className="block text-xs font-medium text-slate-600">Nombre *</label>
            <input
              value={form.nombre}
              onChange={(event) => updateField('nombre', toUpperInput(event.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="NOMBRE COMPLETO"
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Tipo</label>
            <select
              value={form.tipoPersona}
              onChange={(event) => updateField('tipoPersona', event.target.value as TipoPersona)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {TIPOS_PERSONA.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">No. empleado</label>
            <input
              value={form.noEmpleado}
              onChange={(event) => {
                updateField('noEmpleado', event.target.value)
                setFieldErrors((prev) => ({ ...prev, noEmpleado: undefined }))
              }}
              inputMode="numeric"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="EJ. 12345"
              maxLength={20}
            />
            {fieldErrors.noEmpleado && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.noEmpleado}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Empresa</label>
            <input
              list="empresas-sugeridas-create"
              value={form.empresa}
              onChange={(event) => updateField('empresa', toUpperInput(event.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="EMPRESA"
              maxLength={120}
            />
            <datalist id="empresas-sugeridas-create">
              {options.empresas.map((empresa) => (
                <option key={empresa} value={empresa} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Área</label>
            <select
              value={areaIsCustom ? CUSTOM_OPTION_VALUE : form.area}
              onChange={(event) => handleAreaSelect(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Selecciona...</option>
              {options.areas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
              <option value={CUSTOM_OPTION_VALUE}>OTRA / CAPTURAR NUEVA</option>
            </select>

            {areaIsCustom && (
              <input
                value={form.area}
                onChange={(event) => updateField('area', toUpperInput(event.target.value))}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="NUEVA ÁREA"
                maxLength={120}
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Bodega</label>
            <select
              value={bodegaIsCustom ? CUSTOM_OPTION_VALUE : form.bodega}
              onChange={(event) => handleBodegaSelect(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Selecciona...</option>
              {options.bodegas.map((bodega) => (
                <option key={bodega} value={bodega}>
                  {bodega}
                </option>
              ))}
              <option value={CUSTOM_OPTION_VALUE}>OTRA / CAPTURAR NUEVA</option>
            </select>

            {bodegaIsCustom && (
              <input
                value={form.bodega}
                onChange={(event) => updateField('bodega', toUpperInput(event.target.value))}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="NUEVA BODEGA"
                maxLength={120}
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Teléfono</label>
            <input
              value={form.telefono}
              onChange={(event) => {
                updateField('telefono', normalizePhone(event.target.value))
                setFieldErrors((prev) => ({ ...prev, telefono: undefined }))
              }}
              inputMode="numeric"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="6561234567"
              maxLength={10}
            />
            {fieldErrors.telefono && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.telefono}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Email</label>
            <input
              value={form.email}
              onChange={(event) => {
                updateField('email', normalizeEmail(event.target.value))
                setFieldErrors((prev) => ({ ...prev, email: undefined }))
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="correo@empresa.com"
              maxLength={160}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <label className="block text-xs font-medium text-slate-600">QR</label>
            <div className="mt-1 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
              El QR se genera automáticamente al guardar con formato canónico.
            </div>
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <label className="block text-xs font-medium text-slate-600">Notas</label>
            <textarea
              value={form.notas}
              onChange={(event) => updateField('notas', toUpperInput(event.target.value))}
              className="mt-1 min-h-[96px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="OBSERVACIONES OPCIONALES"
              maxLength={500}
            />
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.activo}
            onChange={(event) => updateField('activo', event.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Registrar como activo
        </label>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Guardando...' : 'Crear persona'}
          </button>

          <button
            type="button"
            onClick={() => {
              setForm(INITIAL_STATE)
              setAreaIsCustom(false)
              setBodegaIsCustom(false)
              setFieldErrors({})
              setError(null)
              setSuccess(null)
            }}
            disabled={submitting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Limpiar
          </button>
        </div>
      </form>
    </div>
  )
}