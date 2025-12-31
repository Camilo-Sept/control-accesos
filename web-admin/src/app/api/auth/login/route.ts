import { NextResponse } from 'next/server'

const TOKEN_COOKIE = 'ca_token'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: 'Email y password requeridos' }, { status: 400 })
  }

  const base = process.env.NEXT_PUBLIC_API_BASE_URL
  if (!base) return NextResponse.json({ error: 'NEXT_PUBLIC_API_BASE_URL no está configurada' }, { status: 500 })

  const resp = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: body.email, password: body.password }),
  })

  if (!resp.ok) {
    const txt = await resp.text()
    return NextResponse.json({ error: 'Credenciales inválidas', details: txt }, { status: 401 })
  }

  const json = await resp.json()
  const token = json.token as string

  const res = NextResponse.json({ ok: true, user: json.user })
  res.cookies.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })

  return res
}
