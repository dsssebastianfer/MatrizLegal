'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  lawId: string
  documentoNombre: string | null
  documentoUrl: string | null
}

export default function DocumentSection({ lawId, documentoNombre, documentoUrl }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [nombre, setNombre] = useState(documentoNombre)
  const [url, setUrl] = useState(documentoUrl)
  const [showViewer, setShowViewer] = useState(false)
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
      setNombre(data.nombre)
      setUrl(data.url)
      router.refresh()
    } else {
      const d = await res.json()
      setError(d.error ?? 'Error al subir')
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar el documento adjunto?')) return
    const res = await fetch(`/api/upload/${lawId}`, { method: 'DELETE' })
    if (res.ok) {
      setNombre(null)
      setUrl(null)
      setShowViewer(false)
      router.refresh()
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="font-semibold text-slate-800 mb-4">Documento Oficial</h2>

      {url ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📄</span>
            <div className="flex-1">
              <p className="font-medium text-slate-700 text-sm">{nombre}</p>
              <div className="flex gap-3 mt-1">
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline">Abrir en nueva pestaña</a>
                <button onClick={() => setShowViewer(!showViewer)}
                  className="text-xs text-slate-500 hover:text-slate-800">
                  {showViewer ? 'Ocultar visor' : 'Ver en página'}
                </button>
                <button onClick={handleDelete} className="text-xs text-red-500 hover:text-red-700">
                  Eliminar
                </button>
              </div>
            </div>
            <label className="cursor-pointer border border-slate-300 text-slate-600 rounded-lg px-3 py-1.5 text-xs hover:bg-slate-50 transition-colors">
              {uploading ? 'Subiendo...' : 'Reemplazar'}
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleUpload} />
            </label>
          </div>

          {showViewer && url.endsWith('.pdf') || (showViewer && nombre?.endsWith('.pdf')) ? (
            <iframe
              src={url}
              className="w-full h-[70vh] rounded-lg border border-slate-200"
              title={nombre ?? 'Documento'}
            />
          ) : showViewer ? (
            <div className="bg-slate-50 rounded-lg p-4 text-center text-sm text-slate-500">
              Vista previa no disponible para este tipo de archivo.{' '}
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Descargar</a>
            </div>
          ) : null}
        </div>
      ) : (
        <label className={`flex items-center gap-3 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${
          uploading ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50'
        }`}>
          <span className="text-3xl text-slate-300">📎</span>
          <div>
            <p className="text-sm font-medium text-slate-700">
              {uploading ? 'Subiendo documento...' : 'Adjuntar documento'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">PDF, Word (.docx) — hasta 20 MB</p>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      )}

      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  )
}
