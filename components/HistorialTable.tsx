'use client'

import { useState } from 'react'
import type { AuditLog } from '@/lib/types'
import { CAMPO_LABELS, DESC_STYLES } from '@/lib/audit-utils'
import type { GroupedEventWithLaw } from '@/app/(dashboard)/historial/page'

export default function HistorialTable({ events }: { events: GroupedEventWithLaw[] }) {
  const [selected, setSelected] = useState<GroupedEventWithLaw | null>(null)

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-36" />
            <col className="w-44" />
            <col className="w-[28%]" />
            <col />
          </colgroup>
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Usuario</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Ley</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Cambio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {events.map(event => (
              <tr key={event.id} onClick={() => setSelected(event)}
                className="hover:bg-slate-50 cursor-pointer transition-colors">
                <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                  {new Date(event.timestamp).toLocaleString('es-CL')}
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-600 truncate">
                  {event.usuario_email ?? <span className="text-slate-400 italic">sin usuario</span>}
                </td>
                <td className="px-4 py-2.5 text-xs">
                  {event.law
                    ? <span className="text-slate-700">
                        {event.law.item != null && <span className="text-slate-400 mr-1">#{event.law.item}</span>}
                        <span className="font-medium">{event.law.codigo}</span>
                      </span>
                    : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${DESC_STYLES[event.descripcion] ?? 'bg-slate-100 text-slate-600'}`}>
                    {event.descripcion}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && (
          <p className="text-center py-12 text-slate-400">Sin registros en el historial</p>
        )}
      </div>

      {selected && <DetailModal event={selected} onClose={() => setSelected(null)} />}
    </>
  )
}

export function DetailModal({ event, onClose }: { event: { descripcion: string; law?: { item: number | null; codigo: string } | null; timestamp: string; usuario_email: string | null; changes: AuditLog[] }; onClose: () => void }) {
  const relevant = event.changes.filter(c => c.campo !== 'documento_nombre')

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between shrink-0">
          <div>
            <h2 className="font-semibold text-slate-800">{event.descripcion}</h2>
            {event.law && (
              <p className="text-sm text-slate-500 mt-0.5">
                {event.law.item != null && <span className="text-slate-400">#{event.law.item} · </span>}
                {event.law.codigo}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none mt-0.5">×</button>
        </div>

        <div className="px-6 pt-3 pb-1 shrink-0 flex gap-6 text-xs text-slate-500 border-b border-slate-100">
          <span><strong className="text-slate-600">Fecha:</strong> {new Date(event.timestamp).toLocaleString('es-CL')}</span>
          <span><strong className="text-slate-600">Usuario:</strong> {event.usuario_email ?? '—'}</span>
        </div>

        <div className="px-6 py-4 overflow-y-auto space-y-3">
          {event.changes[0].accion === 'INSERT' && (
            <p className="text-sm text-slate-600 bg-green-50 border border-green-100 rounded-lg px-4 py-3">
              {event.changes[0].tabla === 'laws' ? 'Se registró una nueva ley.' : 'Se agregó un nuevo artículo.'}
            </p>
          )}
          {event.changes[0].accion === 'DELETE' && (
            <p className="text-sm text-slate-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
              {event.changes[0].tabla === 'laws' ? 'Se eliminó la ley del sistema.' : 'Se eliminó el artículo.'}
            </p>
          )}
          {event.changes[0].accion === 'UPDATE' && relevant.map((c, i) => (
            <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 border-b border-slate-200">
                {c.campo ? (CAMPO_LABELS[c.campo] ?? c.campo) : 'Campo'}
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-200">
                <div className="px-3 py-2.5">
                  <p className="text-xs text-red-500 font-medium mb-1">Antes</p>
                  <p className="text-xs text-slate-600 break-words">{c.valor_anterior ?? <span className="text-slate-300 italic">vacío</span>}</p>
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-xs text-green-600 font-medium mb-1">Después</p>
                  <p className="text-xs text-slate-700 break-words">{c.valor_nuevo ?? <span className="text-slate-300 italic">vacío</span>}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">Cerrar</button>
        </div>
      </div>
    </div>
  )
}
