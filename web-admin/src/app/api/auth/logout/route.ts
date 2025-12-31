import { NextResponse } from 'next/server'

const TOKEN_COOKIE = 'ca_token'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(TOKEN_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
