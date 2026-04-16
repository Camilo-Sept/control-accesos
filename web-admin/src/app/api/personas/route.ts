import { NextRequest, NextResponse } from 'next/server'
import { apiPost } from '@/lib/api'
import type { Persona, PersonaCreateInput } from '@/types/persona'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PersonaCreateInput
    const created = await apiPost<Persona>('/personas', body)

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error creando persona'

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