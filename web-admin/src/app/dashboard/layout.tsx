import { AdminNav } from '@/components/AdminNav'
import { IdleLogout } from '@/components/IdleLogout'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdminNav />
      <IdleLogout />
      <main>{children}</main>
    </div>
  )
}
