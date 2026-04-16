import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const TOKEN_COOKIE = 'ca_token'

export async function GET(req: Request) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL
  if (!base) return NextResponse.json({ error: 'NEXT_PUBLIC_API_BASE_URL no está configurada' }, { status: 500 })

  const token = (await cookies()).get(TOKEN_COOKIE)?.value
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const upstream = `${base}/registros/export.pdf${url.search}`

  const resp = await fetch(upstream, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '')
    return NextResponse.json({ error: 'Error exportando PDF', details: txt }, { status: resp.status })
  }

  const buf = await resp.arrayBuffer()

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': resp.headers.get('content-type') || 'application/pdf',
      'Content-Disposition': resp.headers.get('content-disposition') || 'attachment; filename="registros.pdf"',
    },
  })
}
