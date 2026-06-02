import type { EstadoCumplimiento } from '@/lib/types'

const ESTADOS: Record<NonNullable<EstadoCumplimiento>, { label: string; className: string }> = {
  cumple: { label: 'Cumple', className: 'bg-green-100 text-green-800' },
  en_cumplimiento: { label: 'En Cumplimiento', className: 'bg-teal-100 text-teal-800' },
  en_implementacion: { label: 'En Implementación', className: 'bg-blue-100 text-blue-800' },
  parcial: { label: 'Parcial', className: 'bg-yellow-100 text-yellow-800' },
  no_cumple: { label: 'No Cumple', className: 'bg-red-100 text-red-800' },
  na: { label: 'N/A', className: 'bg-slate-100 text-slate-600' },
}

export default function EstadoBadge({ estado }: { estado: EstadoCumplimiento | null }) {
  const config = ESTADOS[estado ?? 'na']
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
