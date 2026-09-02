'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Article, ArticuloBitacora } from '@/lib/types'
import { compareArticulos } from '@/lib/articulo-utils'

interface Props {
  articles: Article[]
  lawId: string
  bitacoraInicial: ArticuloBitacora[]
}

type EditableFields = Pick<Article, 'articulo' | 'ambito_aplicacion' | 'frecuencia_evaluacion' | 'cumple' | 'parcial' | 'no_cumple' | 'na' | 'registro_evidencia'>

function CheckCell({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
        checked ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 hover:border-blue-400'
      } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-300`}
    >
      {checked && <span className="text-xs">✓</span>}
    </button>
  )
}

const ESTADO_FIELDS = ['cumple', 'parcial', 'no_cumple', 'na'] as const
type EstadoField = typeof ESTADO_FIELDS[number]

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

export default function ArticlesTable({ articles: initial, lawId, bitacoraInicial }: Props) {
  const router = useRouter()
  const [articles, setArticles] = useState<Article[]>(initial)
  const [bitacora, setBitacora] = useState<ArticuloBitacora[]>(bitacoraInicial)
  const [saving, setSaving] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [newRow, setNewRow] = useState<Partial<EditableFields>>({})
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [locked, setLocked] = useState(true)

  const bitacoraByArticle = useMemo(() => {
    const map = new Map<string, ArticuloBitacora[]>()
    for (const entry of bitacora) {
      if (!map.has(entry.article_id)) map.set(entry.article_id, [])
      map.get(entry.article_id)!.push(entry)
    }
    return map
  }, [bitacora])

  async function addBitacoraEntry(articleId: string, comentario: string) {
    const res = await fetch(`/api/articulos/${articleId}/bitacora`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comentario }),
    })
    if (res.ok) {
      const created = await res.json()
      setBitacora(prev => [created, ...prev])
      router.refresh()
      return true
    }
    const d = await res.json().catch(() => ({}))
    setError(d.error ?? 'Error al guardar la nota')
    return false
  }

  const sortedArticles = useMemo(() => {
    const hasCustomOrder = articles.some(a => a.orden != null)
    return [...articles].sort((a, b) =>
      hasCustomOrder
        ? (a.orden ?? Infinity) - (b.orden ?? Infinity) || compareArticulos(a.articulo, b.articulo)
        : compareArticulos(a.articulo, b.articulo)
    )
  }, [articles])

  async function moveArticle(id: string, direction: 'up' | 'down') {
    const idx = sortedArticles.findIndex(a => a.id === id)
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (idx === -1 || targetIdx < 0 || targetIdx >= sortedArticles.length) return

    const hasCustomOrder = sortedArticles.some(a => a.orden != null)
    const base = hasCustomOrder ? sortedArticles : sortedArticles.map((a, i) => ({ ...a, orden: i }))

    const ordenA = base[idx].orden
    const ordenB = base[targetIdx].orden
    const idA = base[idx].id
    const idB = base[targetIdx].id
    const next = base.map(a =>
      a.id === idA ? { ...a, orden: ordenB } : a.id === idB ? { ...a, orden: ordenA } : a
    )

    setArticles(prev => prev.map(p => next.find(n => n.id === p.id) ?? p))

    const toPersist = hasCustomOrder ? next.filter(a => a.id === idA || a.id === idB) : next
    await Promise.all(toPersist.map(a =>
      fetch(`/api/articulos/${a.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orden: a.orden }),
      })
    ))
    router.refresh()
  }

  async function updateArticle(id: string, field: keyof EditableFields, value: string | boolean) {
    setSaving(id)
    setError('')
    const res = await fetch(`/api/articulos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    if (res.ok) {
      const updated = await res.json()
      setArticles(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a))
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Error al guardar el cambio')
    }
    setSaving(null)
  }

  async function updateEstado(id: string, field: EstadoField) {
    const article = articles.find(a => a.id === id)
    if (!article) return
    const turningOn = !article[field]
    const values: Record<EstadoField, boolean> = { cumple: false, parcial: false, no_cumple: false, na: false }
    if (turningOn) values[field] = true

    setSaving(id)
    setError('')
    const res = await fetch(`/api/articulos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (res.ok) {
      const updated = await res.json()
      setArticles(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a))
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Error al guardar el cambio')
    }
    setSaving(null)
  }

  async function deleteArticle(id: string) {
    setError('')
    const res = await fetch(`/api/articulos/${id}`, { method: 'DELETE' })
    setDeleteTarget(null)
    if (res.ok) {
      setArticles(prev => prev.filter(a => a.id !== id))
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Error al eliminar el artículo')
    }
  }

  function setNewRowEstado(field: EstadoField) {
    setNewRow(prev => {
      const turningOn = !prev[field]
      const values: Record<EstadoField, boolean> = { cumple: false, parcial: false, no_cumple: false, na: false }
      if (turningOn) values[field] = true
      return { ...prev, ...values }
    })
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
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {deleteTarget && (
        <DeleteConfirmModal
          onConfirm={() => deleteArticle(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Artículos ({sortedArticles.length})</h2>
        <button onClick={() => setLocked(l => !l)}
          className={`text-sm font-medium rounded-lg px-3 py-1.5 border transition-colors ${
            locked
              ? 'border-slate-300 text-slate-600 hover:bg-slate-50'
              : 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100'
          }`}>
          {locked ? 'Editar' : 'Terminar edición'}
        </button>
      </div>

      {error && (
        <div className="mx-6 mt-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-8" />
            <col className="w-[7%]" />
            <col className="w-[24%]" />
            <col className="w-[9%]" />
            <col className="w-[6%]" />
            <col className="w-[6%]" />
            <col className="w-[7%]" />
            <col className="w-[5%]" />
            <col className="w-[12%]" />
            <col className="w-[16%]" />
            <col className="w-8" />
          </colgroup>
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-2 py-2.5"></th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Artículo</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Ámbito de Aplicación</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Frecuencia</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Cumple</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Parcial</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">No Cumple</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">N/A</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Evidencia</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Bitácora</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedArticles.map((article, i) => (
              <tr key={article.id} className={`hover:bg-slate-50 ${saving === article.id ? 'opacity-60' : ''}`}>
                <td className="px-2 py-2">
                  {!locked && (
                    <div className="flex flex-col items-center gap-0.5">
                      <button onClick={() => moveArticle(article.id, 'up')} disabled={i === 0}
                        className="text-slate-300 hover:text-blue-500 disabled:opacity-0 transition-colors leading-none"
                        title="Subir">
                        ▲
                      </button>
                      <button onClick={() => moveArticle(article.id, 'down')} disabled={i === sortedArticles.length - 1}
                        className="text-slate-300 hover:text-blue-500 disabled:opacity-0 transition-colors leading-none"
                        title="Bajar">
                        ▼
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-4 py-2">
                  <EditableCell value={article.articulo ?? ''} onSave={v => updateArticle(article.id, 'articulo', v)} disabled={locked} />
                </td>
                <td className="px-4 py-2">
                  <EditableCell value={article.ambito_aplicacion ?? ''} onSave={v => updateArticle(article.id, 'ambito_aplicacion', v)} multiline disabled={locked} />
                </td>
                <td className="px-4 py-2">
                  <EditableCell value={article.frecuencia_evaluacion ?? ''} onSave={v => updateArticle(article.id, 'frecuencia_evaluacion', v)} disabled={locked} />
                </td>
                <td className="px-4 py-2 text-center">
                  <div className="flex justify-center">
                    <CheckCell checked={article.cumple} onChange={() => updateEstado(article.id, 'cumple')} />
                  </div>
                </td>
                <td className="px-4 py-2 text-center">
                  <div className="flex justify-center">
                    <CheckCell checked={article.parcial} onChange={() => updateEstado(article.id, 'parcial')} />
                  </div>
                </td>
                <td className="px-4 py-2 text-center">
                  <div className="flex justify-center">
                    <CheckCell checked={article.no_cumple} onChange={() => updateEstado(article.id, 'no_cumple')} />
                  </div>
                </td>
                <td className="px-4 py-2 text-center">
                  <div className="flex justify-center">
                    <CheckCell checked={article.na} onChange={() => updateEstado(article.id, 'na')} />
                  </div>
                </td>
                <td className="px-4 py-2">
                  <EditableCell value={article.registro_evidencia ?? ''} onSave={v => updateArticle(article.id, 'registro_evidencia', v)} multiline disabled={locked} />
                </td>
                <td className="px-4 py-2">
                  <BitacoraCell
                    entries={bitacoraByArticle.get(article.id) ?? []}
                    onAdd={comentario => addBitacoraEntry(article.id, comentario)}
                  />
                </td>
                <td className="px-4 py-2">
                  {!locked && (
                    <button
                      onClick={() => setDeleteTarget(article.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors text-xs"
                      title="Eliminar artículo"
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {!locked && addingNew && (
              <tr className="bg-blue-50">
                <td></td>
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
                <td className="px-4 py-2 text-center"><CheckCell checked={!!newRow.cumple} onChange={() => setNewRowEstado('cumple')} /></td>
                <td className="px-4 py-2 text-center"><CheckCell checked={!!newRow.parcial} onChange={() => setNewRowEstado('parcial')} /></td>
                <td className="px-4 py-2 text-center"><CheckCell checked={!!newRow.no_cumple} onChange={() => setNewRowEstado('no_cumple')} /></td>
                <td className="px-4 py-2 text-center"><CheckCell checked={!!newRow.na} onChange={() => setNewRowEstado('na')} /></td>
                <td className="px-4 py-2">
                  <textarea className="w-full border border-blue-300 rounded px-2 py-1 text-xs resize-none" rows={2} placeholder="Evidencia"
                    value={newRow.registro_evidencia ?? ''} onChange={e => setNewRow(p => ({ ...p, registro_evidencia: e.target.value }))} />
                </td>
                <td className="px-4 py-2 text-xs text-slate-300 italic">—</td>
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

      {!locked && !addingNew && (
        <div className="px-6 py-3 border-t border-slate-100">
          <button onClick={() => setAddingNew(true)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            + Agregar artículo
          </button>
        </div>
      )}
    </div>
  )
}

function EditableCell({ value, onSave, multiline, disabled }: { value: string; onSave: (v: string) => void; multiline?: boolean; disabled?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [current, setCurrent] = useState(value)

  function handleBlur() {
    setEditing(false)
    if (current !== value) onSave(current)
  }

  if (!editing) {
    return (
      <div onClick={() => !disabled && setEditing(true)}
        className={`min-h-[1.5rem] text-slate-700 rounded px-1 py-0.5 text-xs break-words whitespace-pre-wrap ${disabled ? 'cursor-default' : 'cursor-text hover:bg-blue-50'}`}
        title={disabled ? undefined : 'Click para editar'}>
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

function BitacoraCell({ entries, onAdd }: { entries: ArticuloBitacora[]; onAdd: (comentario: string) => Promise<boolean> }) {
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  async function handleSave() {
    if (!text.trim()) { setAdding(false); return }
    setSaving(true)
    const ok = await onAdd(text.trim())
    setSaving(false)
    if (ok) { setText(''); setAdding(false) }
  }

  return (
    <div className="flex items-start gap-1.5">
      <div className="flex-1 min-w-0">
        {adding ? (
          <div className="space-y-1">
            <textarea autoFocus rows={2} value={text} onChange={e => setText(e.target.value)}
              placeholder="Escribe una nota..."
              className="w-full border border-blue-400 rounded px-2 py-1 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-blue-400" />
            <div className="flex gap-1">
              <button onClick={handleSave} disabled={saving}
                className="px-2 py-0.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-60">
                Guardar
              </button>
              <button onClick={() => { setAdding(false); setText('') }}
                className="px-2 py-0.5 text-xs text-slate-500 border border-slate-300 rounded hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
            + Agregar nota
          </button>
        )}
      </div>
      <button onClick={() => setShowHistory(true)}
        className="shrink-0 flex items-center gap-0.5 text-slate-400 hover:text-blue-600 transition-colors text-xs"
        title="Ver historial de bitácora">
        🕐{entries.length > 0 && entries.length}
      </button>
      {showHistory && <BitacoraHistoryModal entries={entries} onClose={() => setShowHistory(false)} />}
    </div>
  )
}

function BitacoraHistoryModal({ entries, onClose }: { entries: ArticuloBitacora[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="font-semibold text-slate-800">Historial de bitácora</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-4 overflow-y-auto space-y-3">
          {entries.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Sin comentarios registrados.</p>
          ) : (
            entries.map(e => (
              <div key={e.id} className="border border-slate-200 rounded-lg px-3 py-2.5">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className="text-xs font-medium text-slate-600 truncate">
                    {e.autor_nombre ?? e.autor_email?.split('@')[0] ?? 'Desconocido'}
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">{new Date(e.created_at).toLocaleString('es-CL')}</span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{e.comentario}</p>
              </div>
            ))
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">Cerrar</button>
        </div>
      </div>
    </div>
  )
}
