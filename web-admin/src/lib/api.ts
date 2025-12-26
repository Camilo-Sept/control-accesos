export async function apiGet<T>(path: string): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL
  if (!base) throw new Error('NEXT_PUBLIC_API_BASE_URL no está configurada')

  const url = `${base}${path}`

  const res = await fetch(url, {
    cache: 'no-store',
    // clave: fuerza a Next a tratarlo como dinámico
    next: { revalidate: 0 },
  })

  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  return (await res.json()) as T
}
