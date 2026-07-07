'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Article } from '@/lib/types'
import { compareArticulos } from '@/lib/articulo-utils'

interface Props {
  articles: Article[]
  lawId: string
}

type EditableFields = Pick<Article, 'articulo' | 'ambito_aplicacion' | 'frecuencia_evaluacion' | 'cumple' | 'parcial' | 'no_cumple' | 'na' | 'registro_evidencia'>

function CheckCell({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
        checked ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 hover:border-blue-400'
      }`}
    >
      {checked && <span className="text-xs">✓</span>}
    </button>
  )
}

function DeleteConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-slate-800 mb-2">Eliminar artículo</h3>
        <p className="text-sm text-slate-500 mb-6">¿Estás seguro que deseas eliminar este artículo? Esta acción no se puede deshacer.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ArticlesTable({ articles: initial, lawId }: Props) {
  const router = useRouter()
  const [articles, setArticles] = useState<Article[]>(initial)
  const [saving, setSaving] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [newRow, setNewRow] = useState<Partial<EditableFields>>({})
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const sortedArticles = useMemo(
    () => [...articles].sort((a, b) => compareArticulos(a.articulo, b.articulo)),
    [articles]
  )

  async function updateArticle(id: string, field: keyof EditableFields, value: string | boolean) {
    setSaving(id)
    const res = await fetch(`/api/articulos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    if (res.ok) {
      const updated = await res.json()
      setArticles(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a))
      router.refresh()
    }
    setSaving(null)
  }

  async function deleteArticle(id: string) {
    await fetch(`/api/articulos/${id}`, { method: 'DELETE' })
    setArticles(prev => prev.filter(a => a.id !== id))
    setDeleteTarget(null)
    router.refresh()
  }

  async function saveNewRow() {
    const res = await fetch('/api/articulos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ law_id: lawId, ...newRow }),
    })
    if (res.ok) {
      const created = await res.json()
      setArticles(prev => [...prev, created])
      setNewRow({})
      setAddingNew(false)
      router.refresh()
    }
  }

  return (
    <div>
      {deleteTarget && (
        <DeleteConfirmModal
          onConfirm={() => deleteArticle(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Artículo</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Ámbito de Aplicación</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Frecuencia</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide w-16">Cumple</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide w-16">Parcial</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">No Cumple</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide w-12">N/A</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Evidencia</th>
              <th className="px-4 py-2.5 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedArticles.map(article => (
              <tr key={article.id} className={`hover:bg-slate-50 ${saving === article.id ? 'opacity-60' : ''}`}>
                <td className="px-4 py-2">
                  <EditableCell value={article.articulo ?? ''} onSave={v => updateArticle(article.id, 'articulo', v)} />
                </td>
                <td className="px-4 py-2">
                  <EditableCell value={article.ambito_aplicacion ?? ''} onSave={v => updateArticle(article.id, 'ambito_aplicacion', v)} multiline />
                </td>
                <td className="px-4 py-2">
                  <EditableCell value={article.frecuencia_evaluacion ?? ''} onSave={v => updateArticle(article.id, 'frecuencia_evaluacion', v)} />
                </td>
                <td className="px-4 py-2 text-center">
                  <div className="flex justify-center">
                    <CheckCell checked={article.cumple} onChange={v => updateArticle(article.id, 'cumple', v)} />
                  </div>
                </td>
                <td className="px-4 py-2 text-center">
                  <div className="flex justify-center">
                    <CheckCell checked={article.parcial} onChange={v => updateArticle(article.id, 'parcial', v)} />
                  </div>
                </td>
                <td className="px-4 py-2 text-center">
                  <div className="flex justify-center">
                    <CheckCell checked={article.no_cumple} onChange={v => updateArticle(article.id, 'no_cumple', v)} />
                  </div>
                </td>
                <td className="px-4 py-2 text-center">
                  <div className="flex justify-center">
                    <CheckCell checked={article.na} onChange={v => updateArticle(article.id, 'na', v)} />
                  </div>
                </td>
                <td className="px-4 py-2">
                  <EditableCell value={article.registro_evidencia ?? ''} onSave={v => updateArticle(article.id, 'registro_evidencia', v)} multiline />
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => setDeleteTarget(article.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors text-xs"
                    title="Eliminar artículo"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}

            {addingNew && (
              <tr className="bg-blue-50">
                <td className="px-4 py-2">
                  <input className="w-full border border-blue-300 rounded px-2 py-1 text-xs" placeholder="Artículo"
                    value={newRow.articulo ?? ''} onChange={e => setNewRow(p => ({ ...p, articulo: e.target.value }))} />
                </td>
                <td className="px-4 py-2">
                  <textarea className="w-full border border-blue-300 rounded px-2 py-1 text-xs resize-none" rows={2} placeholder="Ámbito"
                    value={newRow.ambito_aplicacion ?? ''} onChange={e => setNewRow(p => ({ ...p, ambito_aplicacion: e.target.value }))} />
                </td>
                <td className="px-4 py-2">
                  <input className="w-full border border-blue-300 rounded px-2 py-1 text-xs" placeholder="Frecuencia"
                    value={newRow.frecuencia_evaluacion ?? ''} onChange={e => setNewRow(p => ({ ...p, frecuencia_evaluacion: e.target.value }))} />
                </td>
                <td className="px-4 py-2 text-center"><CheckCell checked={!!newRow.cumple} onChange={v => setNewRow(p => ({ ...p, cumple: v }))} /></td>
                <td className="px-4 py-2 text-center"><CheckCell checked={!!newRow.parcial} onChange={v => setNewRow(p => ({ ...p, parcial: v }))} /></td>
                <td className="px-4 py-2 text-center"><CheckCell checked={!!newRow.no_cumple} onChange={v => setNewRow(p => ({ ...p, no_cumple: v }))} /></td>
                <td className="px-4 py-2 text-center"><CheckCell checked={!!newRow.na} onChange={v => setNewRow(p => ({ ...p, na: v }))} /></td>
                <td className="px-4 py-2">
                  <textarea className="w-full border border-blue-300 rounded px-2 py-1 text-xs resize-none" rows={2} placeholder="Evidencia"
                    value={newRow.registro_evidencia ?? ''} onChange={e => setNewRow(p => ({ ...p, registro_evidencia: e.target.value }))} />
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-col gap-1.5">
                    <button onClick={saveNewRow}
                      className="px-2 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors">
                      Aceptar
                    </button>
                    <button onClick={() => { setAddingNew(false); setNewRow({}) }}
                      className="px-2 py-1.5 text-xs text-slate-500 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors">
                      Cancelar
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!addingNew && (
        <div className="px-6 py-3 border-t border-slate-100">
          <button onClick={() => setAddingNew(true)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            + Agregar artículo
          </button>
        </div>
      )}
    </div>
  )
}

function EditableCell({ value, onSave, multiline }: { value: string; onSave: (v: string) => void; multiline?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [current, setCurrent] = useState(value)

  function handleBlur() {
    setEditing(false)
    if (current !== value) onSave(current)
  }

  if (!editing) {
    return (
      <div onClick={() => setEditing(true)}
        className="cursor-text min-h-[1.5rem] text-slate-700 hover:bg-blue-50 rounded px-1 py-0.5 text-xs"
        title="Click para editar">
        {value || <span className="text-slate-300 italic">—</span>}
      </div>
    )
  }

  if (multiline) {
    return (
      <textarea autoFocus rows={3}
        className="w-full border border-blue-400 rounded px-2 py-1 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
        value={current} onChange={e => setCurrent(e.target.value)} onBlur={handleBlur} />
    )
  }

  return (
    <input autoFocus
      className="w-full border border-blue-400 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
      value={current} onChange={e => setCurrent(e.target.value)} onBlur={handleBlur} />
  )
}
