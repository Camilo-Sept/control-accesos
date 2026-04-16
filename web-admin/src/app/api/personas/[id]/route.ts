import { NextRequest, NextResponse } from 'next/server'
import { apiPut } from '@/lib/api'
import type { Persona, PersonaCreateInput } from '@/types/persona'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = (await req.json()) as PersonaCreateInput

    const updated = await apiPut<Persona>(`/personas/${id}`, body)

    return NextResponse.json(updated)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error actualizando persona'

   const match = message.match(/^API\s+(\d+):\s+([\s\S]*)$/)
    if (match) {
      const status = Number(match[1])
      const raw = match[2]

      try {
        return NextResponse.json(JSON.parse(raw), { status })
      } catch {
        return NextResponse.json({ error: raw || 'Error en API remota' }, { status })
      }
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}