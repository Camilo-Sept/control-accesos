import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const TOKEN_COOKIE = 'ca_token'

async function getAuthContext() {
  const cookieStore = await cookies()
  const token = cookieStore.get(TOKEN_COOKIE)?.value
  const base = process.env.NEXT_PUBLIC_API_BASE_URL

  if (!token) {
    return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }

  if (!base) {
    return {
      error: NextResponse.json(
        { error: 'NEXT_PUBLIC_API_BASE_URL no está configurada' },
        { status: 500 }
      ),
    }
  }

  return { token, base }
}

async function proxyJsonResponse(response: Response) {
  const text = await response.text()

  let payload: unknown = {}
  try {
    payload = text ? JSON.parse(text) : {}
  } catch {
    payload = { error: text || 'Error inesperado' }
  }

  return NextResponse.json(payload, { status: response.status })
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if ('error' in auth) return auth.error

  const { id } = await context.params
  const body = await request.text()

  const response = await fetch(`${auth.base}/users/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
    },
    body,
    cache: 'no-store',
  })

  return proxyJsonResponse(response)
}