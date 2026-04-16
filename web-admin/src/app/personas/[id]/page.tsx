import { apiGet } from '@/lib/api'
import { SectionHeader } from '@/components/SectionHeader'
import PersonaEditForm from '@/components/PersonaEditForm'
import PersonaQrPanel from '@/components/PersonaQrPanel'
import type { Persona, PersonaCatalogos } from '@/types/persona'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function PersonaEditPage({ params }: PageProps) {
  const { id } = await params

  const [persona, catalogos] = await Promise.all([
    apiGet<Persona>(`/personas/${id}`),
    apiGet<PersonaCatalogos>('/personas/catalogos'),
  ])

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <SectionHeader
        title="Editar persona"
        description={persona.nombre}
        actions={[
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/personas', label: 'Volver a personas' },
          { href: '#qr-panel', label: 'Ver QR', variant: 'primary' },
        ]}
      />

      <PersonaEditForm persona={persona} catalogos={catalogos} />

      <PersonaQrPanel persona={persona} />
    </div>
  )
}