'use client'

import { useState } from 'react'

export default function ExpandableCell({ text }: { text: string | null }) {
  const [expanded, setExpanded] = useState(false)
  if (!text) return <span className="text-slate-300">—</span>

  return (
    <button
      onClick={() => setExpanded(v => !v)}
      className={`text-left w-full text-slate-600 text-xs leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}
      title={expanded ? 'Click para colapsar' : 'Click para ver completo'}
    >
      {text}
    </button>
  )
}
