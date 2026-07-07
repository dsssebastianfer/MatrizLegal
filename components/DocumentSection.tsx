'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { LawDocument } from '@/lib/types'

interface Props {
  lawId: string
  documents: LawDocument[]
  documentosComentario: string | null
}

export default function DocumentSection({ lawId, documents: initial, documentosComentario }: Props) {
  const [docs, setDocs] = useState<LawDocument[]>(initial)
  const [comentario, setComentario] = useState(documentosComentario ?? '')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/upload/${lawId}`, { method: 'POST', body: form })
    if (res.ok) {
      const data = await res.json()
      setDocs(prev => [...prev, data])
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Error al subir')
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDelete(docId: string) {
    setDeleteTarget(null)
    const res = await fetch(`/api/documentos/${docId}`, { method: 'DELETE' })
    if (res.ok) {
      setDocs(prev => prev.filter(d => d.id !== docId))
      router.refresh()
    }
  }

  async function handleComentario(value: string) {
    const res = await fetch(`/api/leyes/${lawId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentos_comentario: value }),
    })
    if (res.ok) {
      setComentario(value)
      router.refresh()
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-800 mb-2">Eliminar documento</h3>
            <p className="text-sm text-slate-500 mb-6">¿Estás seguro? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteTarget)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Documentos ({docs.length})</h2>
        <label className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
          uploading
            ? 'border-blue-200 text-blue-400 bg-blue-50 cursor-wait'
            : 'border-slate-300 text-slate-600 hover:bg-slate-50'
        }`}>
          {uploading ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Subiendo...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Subir documento
            </>
          )}
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
            onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {error && (
        <div className="mx-6 mt-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="px-6 pt-3">
        <CommentField value={comentario} onSave={handleComentario} />
      </div>

      {docs.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="text-slate-300 text-3xl mb-2">📎</p>
          <p className="text-sm text-slate-400">Sin documentos adjuntos</p>
          <p className="text-xs text-slate-300 mt-1">PDF, Word (.docx)</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {docs.map(doc => (
            <li key={doc.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
              <span className="text-xl shrink-0">📄</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{doc.nombre}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(doc.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  {doc.uploaded_by && <span> · {doc.uploaded_by.split('@')[0]}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a href={doc.url} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 border border-blue-200 rounded-lg px-3 py-1 hover:bg-blue-50 transition-colors">
                  Abrir
                </a>
                <button onClick={() => setDeleteTarget(doc.id)}
                  className="text-slate-300 hover:text-red-500 transition-colors text-sm px-1"
                  title="Eliminar documento">
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CommentField({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [current, setCurrent] = useState(value)

  function handleBlur() {
    setEditing(false)
    if (current !== value) onSave(current)
  }

  if (!editing) {
    return (
      <p onClick={() => setEditing(true)}
        className="text-xs text-slate-500 mt-1 cursor-text hover:bg-blue-50 rounded px-1 -mx-1"
        title="Click para editar">
        {value || <span className="text-slate-300 italic">+ Agregar comentario</span>}
      </p>
    )
  }

  return (
    <textarea autoFocus rows={2}
      className="w-full mt-1 border border-blue-400 rounded px-2 py-1 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
      value={current} onChange={e => setCurrent(e.target.value)} onBlur={handleBlur} />
  )
}
