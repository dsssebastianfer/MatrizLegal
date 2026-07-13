'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { AuditLog } from '@/lib/types'
import { groupAuditItems, DESC_STYLES } from '@/lib/audit-utils'
import type { GroupedEvent } from '@/lib/audit-utils'
import { DetailModal } from './HistorialTable'

export default function AuditPanel({ items, lawCodigo }: { items: AuditLog[]; lawCodigo: string }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<GroupedEvent | null>(null)
  const grouped = groupAuditItems(items)

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <span className="font-semibold text-slate-800">
          Historial de cambios ({grouped.length} eventos)
        </span>
        <span className="text-slate-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100">
          {grouped.length === 0 ? (
            <p className="text-center py-6 text-sm text-slate-400">Sin cambios registrados</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Usuario</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Cambio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grouped.map(event => (
                  <tr key={event.id} onClick={() => setSelected(event)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(event.timestamp).toLocaleString('es-CL')}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-600">
                      {event.usuario_email ?? <span className="text-slate-400 italic">sin usuario</span>}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${DESC_STYLES[event.descripcion] ?? 'bg-slate-100 text-slate-600'}`}>
                        {event.descripcion}
                      </span>
                      {event.articulo_ref && (
                        <span className="ml-1.5 text-xs text-slate-500">{event.articulo_ref}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="px-4 py-3 border-t border-slate-100">
            <Link href={`/historial?ley=${encodeURIComponent(lawCodigo)}`}
              className="text-sm font-medium text-blue-600 hover:text-blue-800">
              Ver historial completo →
            </Link>
          </div>
        </div>
      )}

      {selected && <DetailModal event={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
