'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function NavTabs() {
  const path = usePathname()
  const isHistorial = path.startsWith('/historial')

  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
      <Link
        href="/"
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
          !isHistorial
            ? 'bg-white text-slate-800 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        Leyes
      </Link>
      <Link
        href="/historial"
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
          isHistorial
            ? 'bg-white text-slate-800 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        Historial
      </Link>
    </div>
  )
}
