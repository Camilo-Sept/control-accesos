import { cookies } from 'next/headers'

const TOKEN_COOKIE = 'ca_token'

export async function apiGet<T>(path: string): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL
  if (!base) throw new Error('NEXT_PUBLIC_API_BASE_URL no está configurada')

  const url = `${base}${path}`

  const token = (await cookies()).get(TOKEN_COOKIE)?.value

  const res = await fetch(url, {
    cache: 'no-store',
    next: { revalidate: 0 },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })

  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  return (await res.json()) as T
}
