export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import NavTabs from '@/components/NavTabs'
import { getSessionEmail } from '@/lib/session'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const email = await getSessionEmail()
  if (!email) redirect('/login')

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-bold text-slate-800">Matriz Legal</Link>
            <NavTabs />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="max-w-screen-xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
