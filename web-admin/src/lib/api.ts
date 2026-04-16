import { cookies } from 'next/headers'

const TOKEN_COOKIE = 'ca_token'

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type ApiRequestOptions = {
  method?: RequestMethod
  body?: unknown
}

async function getAuthHeaders(extra?: HeadersInit): Promise<HeadersInit> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value

  const headers: Record<string, string> = {
    ...(extra as Record<string, string> | undefined),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL
  if (!base) throw new Error('NEXT_PUBLIC_API_BASE_URL no está configurada')

  const url = `${base}${path}`
  const method = options.method ?? 'GET'

  const headers = await getAuthHeaders(
    options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined
  )

  const res = await fetch(url, {
    method,
    cache: 'no-store',
    next: { revalidate: 0 },
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status}: ${text}`)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return (await res.json()) as T
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: 'GET' })
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'POST', body })
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'PUT', body })
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'PATCH', body })
}