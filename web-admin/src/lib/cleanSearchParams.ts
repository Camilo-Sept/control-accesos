export function cleanSearchParams(
  searchParams: Record<string, string | string[] | undefined>
) {
  const sp = new URLSearchParams()

  for (const [k, v] of Object.entries(searchParams)) {
    if (v === undefined) continue

    if (Array.isArray(v)) {
      for (const item of v) {
        const value = String(item ?? '').trim()
        if (value !== '') sp.append(k, value)
      }
      continue
    }

    const value = String(v).trim()
    if (value !== '') sp.set(k, value)
  }

  return sp
}
