'use client'

import { useState } from 'react'
import ReviewModal from './ReviewModal'
import type { Law } from '@/lib/types'

type Props = Pick<Law,
  'id' | 'codigo' | 'periodicidad' | 'fecha_ultima_evaluacion' |
  'estado_cumplimiento' | 'observaciones' |
  'vigencia_nota' | 'vigencia_estado' | 'vigencia_revisada_en' | 'vigencia_modificada_en'
>

export default function VigenciaStatus(law: Props) {
  const [open, setOpen] = useState(false)
  const { vigencia_revisada_en: rev, vigencia_modificada_en: mod, vigencia_estado } = law

  if (!rev && !mod && !vigencia_estado) return <span className="text-slate-300 text-xs">—</span>

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' })

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex flex-col gap-0.5"
        title="Click para ver/editar vigencia"
      >
        {vigencia_estado === 'no_vigente' ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
            <span className="w-1.5 h-1.5 rounded-sm bg-red-500 shrink-0" />
            No vigente
          </span>
        ) : (
          <>
            {rev && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                <span className="w-1.5 h-1.5 rounded-sm bg-green-500 shrink-0" />
                {fmt(rev)}
              </span>
            )}
            {mod && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
                <span className="w-1.5 h-1.5 rounded-sm bg-blue-500 shrink-0" />
                {fmt(mod)}
              </span>
            )}
          </>
        )}
      </button>
      {open && <ReviewModal law={law} onClose={() => setOpen(false)} />}
    </>
  )
}
