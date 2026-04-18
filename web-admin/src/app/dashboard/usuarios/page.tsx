'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type Role = 'ADMIN' | 'SUP' | 'GUARD'
type ManageableRole = 'ADMIN' | 'SUP' | 'GUARD'
type RoleFilter = 'ALL' | 'ADMIN' | 'SUP' | 'GUARD'
type ActivoFilter = 'ALL' | 'true' | 'false'

type MeResponse = {
  ok: boolean
  user: {
    id: string
    email: string
    role: Role
  }
}

type UserRow = {
  id: string
  email: string
  fullName: string
  role: Role
  bodega: string
  activo: boolean
  createdAt: string
  updatedAt: string
}

type UsersResponse = {
  ok: boolean
  items: UserRow[]
}

type SaveUserResponse = {
  ok: true
  item: UserRow
}

type CreateUserPayload = {
  fullName: string
  email: string
  password: string
  role: ManageableRole
  bodega: string
}

type UpdateUserPayload = {
  fullName: string
  email: string
  password?: string
  role: ManageableRole
  bodega: string
  activo: boolean
}

type ValidationDetails = {
  formErrors?: string[]
  fieldErrors?: Record<string, string[] | undefined>
}

type ApiErrorShape = {
  error?: string
  message?: string
  details?: ValidationDetails
  formErrors?: string[]
  fieldErrors?: Record<string, string[] | undefined>
}

type UserFormState = {
  fullName: string
  email: string
  password: string
  role: ManageableRole
  bodega: string
  activo: boolean
}

type FieldErrors = {
  fullName?: string
  email?: string
  password?: string
  role?: string
  bodega?: string
}

type FocusField = keyof UserFormState | null

const BODEGA_OPTIONS = [
  'GENERAL',
  'WAREHOUSE 1',
  'WAREHOUSE 2',
  'WAREHOUSE 3',
  'WAREHOUSE 4',
  'WAREHOUSE 5',
  'WAREHOUSE 6',
  'WAREHOUSE 10',
  'WAREHOUSE 11',
]

const FIELD_LABELS: Record<keyof UserFormState, string> = {
  fullName: 'Nombre completo',
  email: 'Correo',
  password: 'Contraseña',
  role: 'Rol',
  bodega: 'Bodega',
  activo: 'Estado',
}

class ApiRequestError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.payload = payload
  }
}

function normalizeFullName(value: string) {
  return value.toUpperCase()
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function validatePassword(value: string) {
  if (value.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres.'
  }

  if (!/[A-Z]/.test(value)) {
    return 'La contraseña debe incluir al menos una mayúscula.'
  }

  if (!/[^A-Za-z0-9]/.test(value)) {
    return 'La contraseña debe incluir al menos un carácter especial.'
  }

  return null
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

function getApiErrorMessage(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) {
    return null
  }

  const maybeError = data as ApiErrorShape

  if (typeof maybeError.error === 'string' && maybeError.error.trim()) {
    return maybeError.error
  }

  if (typeof maybeError.message === 'string' && maybeError.message.trim()) {
    return maybeError.message
  }

  return null
}

function isRoleFilter(value: string): value is RoleFilter {
  return value === 'ALL' || value === 'ADMIN' || value === 'SUP' || value === 'GUARD'
}

function isActivoFilter(value: string): value is ActivoFilter {
  return value === 'ALL' || value === 'true' || value === 'false'
}

function firstFieldError(
  source: Record<string, string[] | undefined> | undefined,
  ...keys: string[]
) {
  if (!source) return undefined

  for (const key of keys) {
    const value = source[key]
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      return value[0]
    }
  }

  return undefined
}

function extractValidation(payload: unknown): { formErrors: string[]; fieldErrors: FieldErrors } {
  const result: { formErrors: string[]; fieldErrors: FieldErrors } = {
    formErrors: [],
    fieldErrors: {},
  }

  if (typeof payload !== 'object' || payload === null) {
    return result
  }

  const maybe = payload as ApiErrorShape
  const details = maybe.details

  const formErrors = [
    ...(Array.isArray(maybe.formErrors) ? maybe.formErrors : []),
    ...(Array.isArray(details?.formErrors) ? details.formErrors : []),
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)

  const fieldSource = details?.fieldErrors ?? maybe.fieldErrors

  result.formErrors = formErrors
  result.fieldErrors = {
    fullName: firstFieldError(fieldSource, 'fullName', 'full_name', 'nombre'),
    email: firstFieldError(fieldSource, 'email', 'correo'),
    password: firstFieldError(fieldSource, 'password', 'contrasena', 'contraseña'),
    role: firstFieldError(fieldSource, 'role', 'rol'),
    bodega: firstFieldError(fieldSource, 'bodega'),
  }

  return result
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })

  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiRequestError(getApiErrorMessage(data) ?? 'Error inesperado', response.status, data)
  }

  return data as T
}

function roleLabel(role: Role) {
  if (role === 'ADMIN') return 'Administrador'
  if (role === 'SUP') return 'Supervisor'
  return 'Guardia'
}

function roleBadge(role: Role) {
  if (role === 'ADMIN') return 'bg-slate-900 text-white'
  if (role === 'SUP') return 'bg-blue-100 text-blue-800'
  return 'bg-emerald-100 text-emerald-800'
}

function buildInitialForm(canManageAdmin: boolean): UserFormState {
  return {
    fullName: '',
    email: '',
    password: '',
    role: canManageAdmin ? 'SUP' : 'SUP',
    bodega: 'GENERAL',
    activo: true,
  }
}

function inputClass(hasError: boolean, isFocused: boolean) {
  if (hasError) {
    return 'w-full rounded-2xl border border-red-400 bg-red-50 px-4 py-3 text-sm outline-none ring-2 ring-red-200'
  }

  if (isFocused) {
    return 'w-full rounded-2xl border border-blue-500 bg-blue-50 px-4 py-3 text-sm outline-none ring-2 ring-blue-200'
  }

  return 'w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
}

function labelClass(hasError: boolean, isFocused: boolean) {
  if (hasError) return 'mb-2 block text-sm font-semibold text-red-700'
  if (isFocused) return 'mb-2 block text-sm font-semibold text-blue-700'
  return 'mb-2 block text-sm font-medium text-slate-700'
}

export default function UsuariosPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitMessages, setSubmitMessages] = useState<string[]>([])
  const [me, setMe] = useState<MeResponse['user'] | null>(null)
  const [items, setItems] = useState<UserRow[]>([])
  const [q, setQ] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL')
  const [activoFilter, setActivoFilter] = useState<ActivoFilter>('ALL')
  const [bodegaFilter, setBodegaFilter] = useState('')
  const [formVisible, setFormVisible] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [focusedField, setFocusedField] = useState<FocusField>(null)
  const formRef = useRef<HTMLDivElement | null>(null)

  const [form, setForm] = useState<UserFormState>(buildInitialForm(false))

  const canManageAdmin = me?.role === 'ADMIN'

  const roleOptions = useMemo<{ value: ManageableRole; label: string }[]>(() => {
    if (canManageAdmin) {
      return [
        { value: 'ADMIN', label: 'Administrador' },
        { value: 'SUP', label: 'Supervisor' },
        { value: 'GUARD', label: 'Guardia' },
      ]
    }

    return [
      { value: 'SUP', label: 'Supervisor' },
      { value: 'GUARD', label: 'Guardia' },
    ]
  }, [canManageAdmin])

  async function loadUsers() {
    const params = new URLSearchParams()

    if (q.trim()) params.set('q', q.trim())
    if (roleFilter !== 'ALL') params.set('role', roleFilter)
    if (activoFilter !== 'ALL') params.set('activo', activoFilter)
    if (bodegaFilter.trim()) params.set('bodega', bodegaFilter.trim())

    const query = params.toString()
    const data = await apiFetch<UsersResponse>(query ? `/api/users?${query}` : '/api/users')
    setItems(data.items)
  }

  async function reloadAll() {
    setLoading(true)
    setPageError(null)

    try {
      const meData = await apiFetch<MeResponse>('/api/auth/me')
      setMe(meData.user)

      const usersData = await apiFetch<UsersResponse>('/api/users')
      setItems(usersData.items)
    } catch (error: unknown) {
      setPageError(getErrorMessage(error, 'No se pudo cargar la pantalla'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reloadAll()
  }, [])

  function resetForm() {
    setEditing(null)
    setFieldErrors({})
    setSubmitError(null)
    setSubmitMessages([])
    setFocusedField(null)
    setForm(buildInitialForm(canManageAdmin))
  }

  function openCreate() {
    resetForm()
    setFormVisible(true)

    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function openEdit(item: UserRow) {
    if (me?.role === 'SUP' && item.role === 'ADMIN') {
      return
    }

    setEditing(item)
    setFieldErrors({})
    setSubmitError(null)
    setSubmitMessages([])
    setFocusedField(null)
    setForm({
      fullName: item.fullName,
      email: item.email,
      password: '',
      role: item.role,
      bodega: item.bodega,
      activo: item.activo,
    })
    setFormVisible(true)

    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function validateForm() {
    const nextErrors: FieldErrors = {}

    if (!form.fullName.trim()) {
      nextErrors.fullName = 'El nombre es obligatorio.'
    }

    if (!validateEmail(form.email)) {
      nextErrors.email = 'Ingresa un correo válido.'
    }

    if (!form.bodega.trim()) {
      nextErrors.bodega = 'Selecciona una bodega.'
    }

    if (!editing || form.password.trim()) {
      const passwordError = validatePassword(form.password.trim())
      if (passwordError) {
        nextErrors.password = passwordError
      }
    }

    if (me?.role === 'SUP' && form.role === 'ADMIN') {
      nextErrors.role = 'Supervisor no puede crear administradores.'
    }

    setFieldErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setSubmitError('Corrige los campos marcados para continuar.')
      setSubmitMessages([])
      return false
    }

    return true
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setSubmitError(null)
    setSubmitMessages([])
    setFieldErrors({})

    if (!validateForm()) {
      setSaving(false)
      return
    }

    try {
      if (!editing) {
        const payload: CreateUserPayload = {
          fullName: normalizeFullName(form.fullName),
          email: normalizeEmail(form.email),
          password: form.password,
          role: form.role,
          bodega: form.bodega,
        }

        await apiFetch<SaveUserResponse>('/api/users', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      } else {
        const payload: UpdateUserPayload = {
          fullName: normalizeFullName(form.fullName),
          email: normalizeEmail(form.email),
          role: form.role,
          bodega: form.bodega,
          activo: form.activo,
        }

        if (form.password.trim()) {
          payload.password = form.password
        }

        await apiFetch<SaveUserResponse>(`/api/users/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      }

      setFormVisible(false)
      resetForm()
      await loadUsers()
    } catch (error: unknown) {
      if (error instanceof ApiRequestError) {
        const validation = extractValidation(error.payload)

        if (Object.values(validation.fieldErrors).some(Boolean)) {
          setFieldErrors(validation.fieldErrors)
        }

        if (validation.formErrors.length > 0) {
          setSubmitMessages(validation.formErrors)
        }

        setSubmitError(
          error.message === 'Payload inválido'
            ? 'Hay campos inválidos en el formulario. Revísalos y corrígelos.'
            : error.message
        )
      } else {
        setSubmitError(getErrorMessage(error, 'No se pudo guardar'))
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-10 w-72 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-24 animate-pulse rounded-3xl bg-slate-200" />
        <div className="h-96 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    )
  }

  if (me?.role === 'GUARD') {
    return (
      <div className="p-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          No tienes permiso para entrar a esta pantalla.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Usuarios</h1>
            <p className="mt-1 text-sm text-slate-500">
              Alta, edición y control de administradores, supervisores y guardias.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
          >
            Nuevo usuario
          </button>
        </div>
      </div>

      {formVisible && (
        <div
          ref={formRef}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {editing ? 'Editar usuario' : 'Nuevo usuario'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {editing
                  ? 'Actualiza los datos del usuario aquí mismo.'
                  : 'Captura los datos del usuario sin salir de esta zona.'}
              </p>
            </div>

            <button
              onClick={() => {
                setFormVisible(false)
                resetForm()
              }}
              className="rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-700"
            >
              Cerrar
            </button>
          </div>

          <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {focusedField ? (
              <span>
                Estás capturando en: <strong>{FIELD_LABELS[focusedField]}</strong>
              </span>
            ) : (
              <span>
                Completa los campos y revisa los mensajes en rojo si algo está mal.
              </span>
            )}
          </div>

          {(submitError || submitMessages.length > 0) && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError && <p className="m-0 font-semibold">{submitError}</p>}
              {submitMessages.length > 0 && (
                <ul className="mt-2 list-disc pl-5">
                  {submitMessages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                className={labelClass(!!fieldErrors.fullName, focusedField === 'fullName')}
              >
                Nombre completo
              </label>
              <input
                value={form.fullName}
                onFocus={() => setFocusedField('fullName')}
                onBlur={() => setFocusedField(null)}
                onChange={(event) =>
                  setForm((state) => ({
                    ...state,
                    fullName: normalizeFullName(event.target.value),
                  }))
                }
                className={inputClass(!!fieldErrors.fullName, focusedField === 'fullName')}
                required
              />
              {fieldErrors.fullName && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.fullName}</p>
              )}
            </div>

            <div>
              <label className={labelClass(!!fieldErrors.email, focusedField === 'email')}>
                Correo
              </label>
              <input
                type="email"
                value={form.email}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                onChange={(event) =>
                  setForm((state) => ({
                    ...state,
                    email: normalizeEmail(event.target.value),
                  }))
                }
                className={inputClass(!!fieldErrors.email, focusedField === 'email')}
                required
              />
              {fieldErrors.email && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className={labelClass(!!fieldErrors.password, focusedField === 'password')}>
                {editing ? 'Nueva contraseña (opcional)' : 'Contraseña'}
              </label>
              <input
                type="password"
                value={form.password}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                onChange={(event) =>
                  setForm((state) => ({ ...state, password: event.target.value }))
                }
                className={inputClass(!!fieldErrors.password, focusedField === 'password')}
                placeholder={editing ? 'Déjala vacía para no cambiarla' : 'Mínimo 8, 1 mayúscula y 1 especial'}
              />
              {fieldErrors.password && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
              )}
            </div>

            <div>
              <label className={labelClass(!!fieldErrors.role, focusedField === 'role')}>
                Rol
              </label>
              <select
                value={form.role}
                onFocus={() => setFocusedField('role')}
                onBlur={() => setFocusedField(null)}
                onChange={(event) =>
                  setForm((state) => ({
                    ...state,
                    role: event.target.value as ManageableRole,
                  }))
                }
                className={inputClass(!!fieldErrors.role, focusedField === 'role')}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {fieldErrors.role && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.role}</p>
              )}
            </div>

            <div>
              <label className={labelClass(!!fieldErrors.bodega, focusedField === 'bodega')}>
                Bodega
              </label>
              <select
                value={form.bodega}
                onFocus={() => setFocusedField('bodega')}
                onBlur={() => setFocusedField(null)}
                onChange={(event) =>
                  setForm((state) => ({ ...state, bodega: event.target.value }))
                }
                className={inputClass(!!fieldErrors.bodega, focusedField === 'bodega')}
              >
                {BODEGA_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {fieldErrors.bodega && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.bodega}</p>
              )}
            </div>

            {editing && (
              <div className="md:col-span-2">
                <label className="mb-2 flex items-center gap-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.activo}
                    onFocus={() => setFocusedField('activo')}
                    onBlur={() => setFocusedField(null)}
                    onChange={(event) =>
                      setForm((state) => ({ ...state, activo: event.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Usuario activo
                </label>
              </div>
            )}

            <div className="mt-2 flex justify-end gap-3 md:col-span-2">
              <button
                type="button"
                onClick={() => {
                  setFormVisible(false)
                  resetForm()
                }}
                className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear usuario'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Total visibles</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{items.length}</div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Administradores</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            {items.filter((item) => item.role === 'ADMIN').length}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Supervisores</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            {items.filter((item) => item.role === 'SUP').length}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Guardias</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            {items.filter((item) => item.role === 'GUARD').length}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-5">
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Buscar por nombre, correo o bodega"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-0 transition focus:border-slate-900"
          />

          <select
            value={roleFilter}
            onChange={(event) => {
              const value = event.target.value
              if (isRoleFilter(value)) {
                setRoleFilter(value)
              }
            }}
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
          >
            <option value="ALL">Todos los roles</option>
            <option value="ADMIN">Administradores</option>
            <option value="SUP">Supervisores</option>
            <option value="GUARD">Guardias</option>
          </select>

          <select
            value={bodegaFilter}
            onChange={(event) => setBodegaFilter(event.target.value)}
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
          >
            <option value="">Todas las bodegas</option>
            {BODEGA_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={activoFilter}
            onChange={(event) => {
              const value = event.target.value
              if (isActivoFilter(value)) {
                setActivoFilter(value)
              }
            }}
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
          >
            <option value="ALL">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>

          <button
            onClick={() => void loadUsers()}
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
          >
            Aplicar filtros
          </button>
        </div>
      </div>

      {pageError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4">Usuario</th>
                <th className="px-5 py-4">Rol</th>
                <th className="px-5 py-4">Bodega</th>
                <th className="px-5 py-4">Estado</th>
                <th className="px-5 py-4">Actualizado</th>
                <th className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">
                    No hay usuarios para mostrar.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-900">{item.fullName}</div>
                      <div className="text-sm text-slate-500">{item.email}</div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${roleBadge(item.role)}`}
                      >
                        {roleLabel(item.role)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">{item.bodega}</td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          item.activo
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {item.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-500">
                      {new Date(item.updatedAt).toLocaleString('es-MX')}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {me?.role === 'SUP' && item.role === 'ADMIN' ? (
                        <span className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-400">
                          Sin permiso
                        </span>
                      ) : (
                        <button
                          onClick={() => openEdit(item)}
                          className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                        >
                          Editar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}