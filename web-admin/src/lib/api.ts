import { cookies } from 'next/headers'

const TOKEN_COOKIE = 'ca_token'

export async function apiGet<T>(path: string): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL
  if (!base) throw new Error('NEXT_PUBLIC_API_BASE_URL no está configurada')

  // ✅ compatible con Next donde cookies() es async (VSCode pide await)
  const cookieStore = await cookies()
  const token = cookieStore.get(TOKEN_COOKIE)?.value

  const url = `${base}${path}`

  const res = await fetch(url, {
    cache: 'no-store',
    next: { revalidate: 0 },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })

  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  return (await res.json()) as T
}
