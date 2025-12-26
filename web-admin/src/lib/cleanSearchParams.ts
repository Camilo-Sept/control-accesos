export function cleanSearchParams(
  searchParams: Record<string, string | string[] | undefined>
) {
  const sp = new URLSearchParams()

  for (const [k, v] of Object.entries(searchParams)) {
    if (v === undefined) continue

    if (Array.isArray(v)) {
      for (const item of v) {
        const val = (item ?? '').trim()
        if (val) sp.append(k, val)
      }
      continue
    }

    const val = (v ?? '').trim()
    if (val) sp.set(k, val)
  }

  return sp
}
