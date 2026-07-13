'use client'

import { useState } from 'react'
import ReviewModal from './ReviewModal'
import type { Law } from '@/lib/types'

type Props = Pick<Law,
  'id' | 'codigo' | 'periodicidad' | 'fecha_ultima_evaluacion' |
  'vigencia_nota' | 'vigencia_estado' | 'vigencia_revisada_en' | 'vigencia_modificada_en'
>

export default function LawDetailActions(law: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 flex items-center gap-1.5 bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Revisar vigencia
      </button>
      {open && <ReviewModal law={law} onClose={() => setOpen(false)} />}
    </>
  )
}
