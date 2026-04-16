'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Persona, PersonaCatalogos, PersonaCreateInput, TipoPersona } from '@/types/persona'
import {
  buildPersonaCatalogs,
  CUSTOM_OPTION_VALUE,
  getEmailError,
  getPhoneError,
  isCustomOption,
  normalizeEmail,
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
  email?: string
  telefono?: string
}

type PersonaEditFormProps = {
  persona: Persona
  catalogos: PersonaCatalogos
}

function getApiErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return 'No se pudo actualizar la persona.'

  const error = 'error' in payload && typeof payload.error === 'string' ? payload.error : null
  if (error) return error

  return 'No se pudo actualizar la persona.'
}

function buildInitialState(persona: Persona): FormState {
  return {
    nombre: persona.nombre ?? '',
    noEmpleado: persona.noEmpleado ?? '',
    empresa: persona.empresa ?? '',
    area: persona.area ?? '',
    bodega: persona.bodega ?? '',
    tipoPersona: persona.tipoPersona,
    activo: persona.activo,
    telefono: persona.telefono ?? '',
    email: persona.email ?? '',
    notas: persona.notas ?? '',
  }
}

export default function PersonaEditForm({
  persona,
  catalogos,
}: PersonaEditFormProps) {
  const router = useRouter()

  const options = useMemo(() => buildPersonaCatalogs(catalogos), [catalogos])

  const [form, setForm] = useState<FormState>(() => buildInitialState(persona))
  const [areaIsCustom, setAreaIsCustom] = useState<boolean>(
    isCustomOption(persona.area ?? '', options.areas)
  )
  const [bodegaIsCustom, setBodegaIsCustom] = useState<boolean>(
    isCustomOption(persona.bodega ?? '', options.bodegas)
  )
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setForm(buildInitialState(persona))
    setAreaIsCustom(isCustomOption(persona.area ?? '', options.areas))
    setBodegaIsCustom(isCustomOption(persona.bodega ?? '', options.bodegas))
    setFieldErrors({})
    setError(null)
  }, [persona, options])

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

    const emailError = getEmailError(form.email)
    const telefonoError = getPhoneError(form.telefono)

    if (emailError) nextErrors.email = emailError
    if (telefonoError) nextErrors.telefono = telefonoError

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function buildPayload(): PersonaCreateInput {
    return {
      nombre: toUpperInput(form.nombre).trim(),
      noEmpleado: toNullable(toUpperInput(form.noEmpleado)),
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
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
      const res = await fetch(`/api/personas/${persona.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as unknown
        setError(getApiErrorMessage(data))
        setSubmitting(false)
        return
      }

      router.push('/personas')
      router.refresh()
    } catch {
      setError('Ocurrió un error de red al actualizar la persona.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h1 className="text-2xl font-semibold text-slate-900">Editar persona</h1>
        <p className="mt-1 text-sm text-slate-500">
          Actualiza la información del registro seleccionado.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Nombre *</label>
            <input
              value={form.nombre}
              onChange={(e) => updateField('nombre', toUpperInput(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="NOMBRE COMPLETO"
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">No. empleado</label>
            <input
              value={form.noEmpleado}
              onChange={(e) => updateField('noEmpleado', toUpperInput(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="EMP001"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Tipo</label>
            <select
              value={form.tipoPersona}
              onChange={(e) => updateField('tipoPersona', e.target.value as TipoPersona)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              {TIPOS_PERSONA.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Empresa</label>
            <input
              list={`empresas-sugeridas-${persona.id}`}
              value={form.empresa}
              onChange={(e) => updateField('empresa', toUpperInput(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="EMPRESA"
              maxLength={120}
            />
            <datalist id={`empresas-sugeridas-${persona.id}`}>
              {options.empresas.map((empresa) => (
                <option key={empresa} value={empresa} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Área</label>
            <select
              value={areaIsCustom ? CUSTOM_OPTION_VALUE : form.area}
              onChange={(e) => handleAreaSelect(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
                onChange={(e) => updateField('area', toUpperInput(e.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder="NUEVA ÁREA"
                maxLength={120}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Bodega</label>
            <select
              value={bodegaIsCustom ? CUSTOM_OPTION_VALUE : form.bodega}
              onChange={(e) => handleBodegaSelect(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
                onChange={(e) => updateField('bodega', toUpperInput(e.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder="NUEVA BODEGA"
                maxLength={120}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Teléfono</label>
            <input
              value={form.telefono}
              onChange={(e) => {
                updateField('telefono', normalizePhone(e.target.value))
                setFieldErrors((prev) => ({ ...prev, telefono: undefined }))
              }}
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="6561234567"
              maxLength={10}
            />
            {fieldErrors.telefono && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.telefono}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              value={form.email}
              onChange={(e) => {
                updateField('email', normalizeEmail(e.target.value))
                setFieldErrors((prev) => ({ ...prev, email: undefined }))
              }}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="correo@empresa.com"
              maxLength={160}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">QR canónico</label>
            <div className="mt-1 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="break-all text-sm font-medium text-slate-800">
                {persona.qrValue ?? 'SE ASIGNARÁ AUTOMÁTICAMENTE'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                El QR no se edita manualmente. El backend lo mantiene estable con el ID interno.
              </p>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Notas</label>
            <textarea
              value={form.notas}
              onChange={(e) => updateField('notas', toUpperInput(e.target.value))}
              className="mt-1 min-h-[120px] w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="OBSERVACIONES OPCIONALES"
              maxLength={500}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => updateField('activo', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Persona activa
          </label>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={() => router.push('/personas')}
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}