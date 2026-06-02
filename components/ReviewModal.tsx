'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Law, EstadoCumplimiento } from '@/lib/types'
import { diasDesdeEval } from '@/lib/revision-utils'

interface Props {
  law: Pick<Law,
    'id' | 'codigo' | 'periodicidad' | 'fecha_ultima_evaluacion' |
    'estado_cumplimiento' | 'observaciones' |
    'vigencia' | 'vigencia_nota' | 'vigencia_estado' | 'vigencia_revisada_en' | 'vigencia_modificada_en'
  >
  onClose: () => void
}

const ESTADOS: { value: EstadoCumplimiento; label: string; color: string }[] = [
  { value: 'en_cumplimiento',   label: 'En Cumplimiento',   color: 'border-teal-500 bg-teal-50 text-teal-700' },
  { value: 'en_implementacion', label: 'En Implementación', color: 'border-blue-500 bg-blue-50 text-blue-700' },
  { value: 'no_cumple',         label: 'No Cumplimiento',   color: 'border-red-500 bg-red-50 text-red-700' },
]

function fmtDate(iso: string | Date) {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

interface HistorialEntry { id: string; valor_anterior: string | null; valor_nuevo: string | null; usuario_email: string | null; created_at: string }

export default function ReviewModal({ law, onClose }: Props) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)

  // Vigencia
  const [vigenciaNota,         setVigenciaNota]        = useState(law.vigencia_nota ?? '')
  const [vigenciaEstado,       setVigenciaEstado]      = useState<'vigente' | 'no_vigente' | null>(law.vigencia_estado ?? null)
  const [vigenciaRevisadaEn,   setVigenciaRevisadaEn]  = useState(law.vigencia_revisada_en ?? '')
  const [vigenciaModificadaEn, setVigenciaModificadaEn]= useState(law.vigencia_modificada_en ?? '')
  const [showVigenciaInput,    setShowVigenciaInput]   = useState(false)
  const [vigenciaInputText,    setVigenciaInputText]   = useState('')
  const [historial,            setHistorial]           = useState<HistorialEntry[] | null>(null)
  const [loadingHistorial,     setLoadingHistorial]    = useState(false)
  const [showHistorial,        setShowHistorial]       = useState(false)

  // Implementación
  const [estado, setEstado] = useState<EstadoCumplimiento>(
    (['en_cumplimiento', 'en_implementacion', 'no_cumple'].includes(law.estado_cumplimiento ?? '')
      ? law.estado_cumplimiento! : 'en_cumplimiento')
  )
  const [observaciones, setObservaciones] = useState(law.observaciones ?? '')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const dias = diasDesdeEval(law.fecha_ultima_evaluacion)

  const modificacionTexto = vigenciaNota.includes('Actualización:')
    ? vigenciaNota.split('Actualización:')[1]?.trim()
    : null

  function handleRegistrarVigente() {
    setVigenciaNota(`Vigencia revisada el ${fmtDate(new Date())}`)
    setVigenciaEstado('vigente')
    setVigenciaRevisadaEn(today)
    setShowVigenciaInput(false)
  }

  function handleNoVigente() {
    setVigenciaEstado('no_vigente')
    setVigenciaNota('No vigente')
    setVigenciaRevisadaEn(today)
    setShowVigenciaInput(false)
  }

  function handleConfirmarActualizacion() {
    if (!vigenciaInputText.trim()) return
    setVigenciaNota(`Vigencia revisada. Actualización: ${vigenciaInputText.trim()}`)
    setVigenciaRevisadaEn(today)
    setVigenciaModificadaEn(today)
    setShowVigenciaInput(false)
    setVigenciaInputText('')
  }

  async function toggleHistorial() {
    if (showHistorial) { setShowHistorial(false); return }
    if (!historial) {
      setLoadingHistorial(true)
      const res = await fetch(`/api/leyes/${law.id}/vigencia-historial`)
      const data = await res.json()
      setHistorial(Array.isArray(data) ? data : [])
      setLoadingHistorial(false)
    }
    setShowHistorial(true)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/leyes/${law.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado_cumplimiento: estado,
          observaciones: observaciones || null,
          fecha_ultima_evaluacion: today,
          vigencia_nota: vigenciaNota || null,
          vigencia_estado: vigenciaEstado,
          vigencia_revisada_en: vigenciaRevisadaEn || null,
          vigencia_modificada_en: vigenciaModificadaEn || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? `Error ${res.status}`)
        setSaving(false)
        return
      }
      router.refresh()
      onClose()
    } catch {
      setError('Error de conexión.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-h-[90vh] flex flex-col transition-all duration-200 ${showHistorial ? 'max-w-3xl' : 'max-w-lg'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between shrink-0">
          <div>
            <h2 className="font-semibold text-slate-800">Actualizar revisión</h2>
            <p className="text-sm text-slate-500 mt-0.5">{law.codigo}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none mt-0.5">×</button>
        </div>

        {/* Body — split layout when historial abierto */}
        <div className="flex flex-1 overflow-hidden">

          {/* Panel izquierdo — formulario */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* ── Vigencia ── */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Vigencia</p>
                <button onClick={toggleHistorial}
                  className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                    showHistorial
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}>
                  {loadingHistorial ? 'Cargando...' : showHistorial ? '← Ocultar historial' : 'Ver historial →'}
                </button>
              </div>

              {/* Estado de vigencia */}
              <div className="space-y-1">
                {vigenciaEstado === 'no_vigente' ? (
                  <p className="text-sm font-medium text-red-600">
                    No vigente
                    {vigenciaRevisadaEn && (
                      <span className="font-normal text-slate-400"> — registrado el {fmtDate(vigenciaRevisadaEn)}</span>
                    )}
                  </p>
                ) : vigenciaRevisadaEn ? (
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">Vigente</span>
                    <span className="text-slate-400"> — actualizado el </span>
                    <span className="text-slate-600">{fmtDate(vigenciaRevisadaEn)}</span>
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 italic">Sin registro de vigencia</p>
                )}

                {vigenciaModificadaEn && modificacionTexto && (
                  <p className="text-sm text-slate-700">
                    <span className="text-slate-400">Última modificación el </span>
                    <span className="text-slate-600">{fmtDate(vigenciaModificadaEn)}</span>
                    <span className="text-slate-400">: </span>
                    <span>{modificacionTexto}</span>
                  </p>
                )}
              </div>

              {/* Textarea actualización */}
              {showVigenciaInput && (
                <div className="space-y-2">
                  <textarea autoFocus value={vigenciaInputText}
                    onChange={e => setVigenciaInputText(e.target.value)} rows={3}
                    placeholder="Describe la modificación de la vigencia..."
                    className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setShowVigenciaInput(false); setVigenciaInputText('') }}
                      className="px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">
                      Cancelar
                    </button>
                    <button onClick={handleConfirmarActualizacion} disabled={!vigenciaInputText.trim()}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      Confirmar
                    </button>
                  </div>
                </div>
              )}

              {!showVigenciaInput && (
                <div className="flex items-center gap-2">
                  <button onClick={handleRegistrarVigente}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                    Registrar como vigente
                  </button>
                  <button onClick={() => setShowVigenciaInput(true)}
                    className="px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                    Actualizar
                  </button>
                  <button onClick={handleNoVigente}
                    className="ml-auto px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                    No vigente
                  </button>
                </div>
              )}
            </div>

            {/* ── Días sin revisión ── */}
            {dias !== null && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">
                Última evaluación hace <strong>{dias} días</strong>
                {law.periodicidad && <span> · Periodicidad: {law.periodicidad}</span>}
              </div>
            )}

            {/* ── Implementación ── */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Implementación</label>
              <div className="grid grid-cols-3 gap-2">
                {ESTADOS.map(e => (
                  <button key={e.value} onClick={() => setEstado(e.value)}
                    className={`px-3 py-2.5 rounded-lg text-sm border-2 text-center font-medium transition-colors ${
                      estado === e.value ? e.color : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
              <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={3}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe el estado actual de implementación..." />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">{error}</div>
            )}
          </div>

          {/* Panel derecho — historial */}
          {showHistorial && (
            <div className="w-72 border-l border-slate-200 flex flex-col shrink-0">
              <div className="px-4 py-3 border-b border-slate-100 shrink-0">
                <p className="text-sm font-semibold text-slate-700">Historial de vigencia</p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {loadingHistorial ? (
                  <p className="text-xs text-slate-400 text-center py-4">Cargando...</p>
                ) : !historial || historial.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Sin cambios anteriores.</p>
                ) : (
                  historial.map(h => (
                    <div key={h.id} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">{new Date(h.created_at).toLocaleDateString('es-CL')}</span>
                        {h.usuario_email && <span className="text-xs text-slate-500 truncate max-w-28">{h.usuario_email.split('@')[0]}</span>}
                      </div>
                      {h.valor_nuevo && <p className="text-xs text-slate-700 leading-relaxed">{h.valor_nuevo}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
