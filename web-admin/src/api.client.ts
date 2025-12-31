export async function apiGetClient<T>(path: string): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL
  if (!base) throw new Error('NEXT_PUBLIC_API_BASE_URL no está configurada')

  const url = `${base}${path}`

  // OJO: el token está en cookie httpOnly, el browser la manda automáticamente.
  // Para que se mande en fetch cross-origin, necesitamos credentials: 'include'.
  const res = await fetch(url, {
    cache: 'no-store',
    credentials: 'include',
  })

  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  return (await res.json()) as T
}
