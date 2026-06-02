import Link from 'next/link'
import LawForm from '@/components/LawForm'

export default function NuevaLeyPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/" className="hover:text-blue-600">Leyes</Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">Nueva Ley</span>
      </div>
      <h1 className="text-2xl font-bold text-slate-800">Nueva Ley / Decreto</h1>
      <LawForm />
    </div>
  )
}
