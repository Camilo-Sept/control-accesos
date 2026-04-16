import Link from 'next/link'

type HeaderAction = {
  href: string
  label: string
  variant?: 'primary' | 'secondary'
}

type SectionHeaderProps = {
  title: string
  description?: string
  actions?: HeaderAction[]
}

function actionClass(variant: HeaderAction['variant'] = 'secondary') {
  if (variant === 'primary') {
    return 'inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700'
  }

  return 'inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50'
}

export function SectionHeader({
  title,
  description,
  actions = [],
}: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>

      {!!actions.length && (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Link
              key={`${action.href}-${action.label}`}
              href={action.href}
              className={actionClass(action.variant)}
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}