'use client'

import { useState } from 'react'
import { isOverdue } from '@/lib/revision-utils'
import EstadoBadge from './EstadoBadge'
import ReviewModal from './ReviewModal'
import type { Law } from '@/lib/types'

type Props = Pick<Law,
  'id' | 'codigo' | 'periodicidad' | 'fecha_ultima_evaluacion' |
  'estado_cumplimiento' | 'observaciones' |
  'vigencia_nota' | 'vigencia_estado' | 'vigencia_revisada_en' | 'vigencia_modificada_en'
>

export default function ReviewStatusBadge(law: Props) {
  const [open, setOpen] = useState(false)
  const pending = isOverdue(law.periodicidad, law.fecha_ultima_evaluacion)

  return (
    <>
      {pending ? (
        <button onClick={() => setOpen(true)}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors cursor-pointer"
          title="Pendiente de revisión — click para actualizar">
          Pendiente
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="cursor-pointer" title="Click para actualizar estado">
          <EstadoBadge estado={law.estado_cumplimiento} />
        </button>
      )}
      {open && <ReviewModal law={law} onClose={() => setOpen(false)} />}
    </>
  )
}
