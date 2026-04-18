import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const TOKEN_COOKIE = 'ca_token'

type ApiMeResponse = {
  ok: boolean
  user: {
    id: string
    email: string
    role: string
  }
}

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(TOKEN_COOKIE)?.value

  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const base = process.env.NEXT_PUBLIC_API_BASE_URL
  if (!base) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_API_BASE_URL no está configurada' },
      { status: 500 }
    )
  }

  const resp = await fetch(`${base}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })

  if (!resp.ok) {
    const res = NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    res.cookies.set(TOKEN_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    })
    return res
  }

  const json = (await resp.json()) as ApiMeResponse

  return NextResponse.json({
    ok: true,
    user: json.user,
  })
}