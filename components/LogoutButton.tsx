'use client'

import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="text-xs text-slate-500 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50"
    >
      Salir
    </button>
  )
}
