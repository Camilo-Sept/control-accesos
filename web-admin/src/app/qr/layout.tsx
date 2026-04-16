import { AdminNav } from '@/components/AdminNav'
import { IdleLogout } from '@/components/IdleLogout'

export default function QrLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <IdleLogout />
      <AdminNav />
      <main>{children}</main>
    </>
  )
}