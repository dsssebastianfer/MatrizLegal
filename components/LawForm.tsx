'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type FormData = {
  item: number | null
  codigo: string
  titular: string
  anio_publicacion: string
  descripcion: string
  mecanismo_evaluacion: string
  periodicidad: string
  aplicacion: string
  area: string
}

interface Props {
  initial?: Partial<FormData>
  lawId?: string
}

const AREAS_OPTIONS = ['Calidad', 'Ambiente', 'S&ST'] as const

function parseAreas(area: string | null | undefined): Set<string> {
  if (!area) return new Set()
  return new Set(area.split('/').map(a => a.trim()).filter(Boolean))
}

function areasToString(areas: Set<string>): string {
  return AREAS_OPTIONS.filter(a => areas.has(a)).join(' / ')
}

export default function LawForm({ initial = {}, lawId }: Props) {
  const router = useRouter()
  const isNew = !lawId

  const [form, setForm] = useState<FormData>({
    item: initial.item ?? null,
    codigo: initial.codigo ?? '',
    titular: initial.titular ?? '',
    anio_publicacion: initial.anio_publicacion ?? '',
    descripcion: initial.descripcion ?? '',
    mecanismo_evaluacion: initial.mecanismo_evaluacion ?? '',
    periodicidad: initial.periodicidad ?? '',
    aplicacion: initial.aplicacion ?? '',
    area: initial.area ?? '',
  })
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(() => parseAreas(initial.area))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Fetch next item en background solo para nueva ley
  useEffect(() => {
    if (!isNew || form.item !== null) return
    fetch('/api/leyes/next-item')
      .then(r => r.json())
      .then(d => setForm(prev => ({ ...prev, item: d.nextItem ?? null })))
      .catch(() => {})
  }, [isNew]) // eslint-disable-line react-hooks/exhaustive-deps

  function set(field: keyof FormData, value: string | number | null) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleArea(area: string) {
    const next = new Set(selectedAreas)
    if (next.has(area)) next.delete(area); else next.add(area)
    setSelectedAreas(next)
    setForm(prev => ({ ...prev, area: areasToString(next) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.codigo?.trim()) { setError('El código es requerido'); return }
    setSaving(true)
    setError('')

    const today = new Date().toISOString().slice(0, 10)
    const body: Record<string, unknown> = {
      ...form,
      area: areasToString(selectedAreas) || null,
    }

    // Al crear: set vigencia automáticamente
    if (isNew) {
      body.vigencia_estado = 'vigente'
      body.vigencia_revisada_en = today
      body.vigencia_nota = `Vigencia revisada el ${new Date().toLocaleDateString('es-CL')}`
    }

    const method = lawId ? 'PUT' : 'POST'
    const url = lawId ? `/api/leyes/${lawId}` : '/api/leyes'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const data = await res.json()
      router.push(`/leyes/${lawId ?? data.id}`)
      router.refresh()
    } else {
      const d = await res.json()
      setError(d.error ?? 'Error al guardar')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        <Field label="Ítem">
          <input type="number" value={form.item ?? ''}
            onChange={e => set('item', e.target.value ? +e.target.value : null)}
            className="field-input" placeholder="Auto" />
        </Field>

        <Field label="Código *" required>
          <input type="text" value={form.codigo} onChange={e => set('codigo', e.target.value)}
            className="field-input" placeholder="Ej: DS 594, Ley 16744" required />
        </Field>

        <Field label="Titular" className="md:col-span-2">
          <input type="text" value={form.titular} onChange={e => set('titular', e.target.value)}
            className="field-input" placeholder="Ministerio..." />
        </Field>

        <Field label="Descripción" className="md:col-span-2">
          <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
            className="field-input resize-none" rows={3} />
        </Field>

        <Field label="Área">
          <div className="flex gap-4 mt-1">
            {AREAS_OPTIONS.map(area => (
              <label key={area} className="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" checked={selectedAreas.has(area)} onChange={() => toggleArea(area)}
                  className="w-4 h-4 rounded accent-blue-600" />
                <span className="text-sm text-slate-700">{area}</span>
              </label>
            ))}
          </div>
        </Field>

        <Field label="Fecha Publicación">
          <input type="text" value={form.anio_publicacion} onChange={e => set('anio_publicacion', e.target.value)}
            className="field-input" placeholder="2024-01-15" />
        </Field>

        <Field label="Mecanismo de Evaluación">
          <input type="text" value={form.mecanismo_evaluacion} onChange={e => set('mecanismo_evaluacion', e.target.value)}
            className="field-input" placeholder="Revisión documentación, Inspección..." />
        </Field>

        <Field label="Periodicidad">
          <input type="text" value={form.periodicidad} onChange={e => set('periodicidad', e.target.value)}
            className="field-input" placeholder="Mensual, Anual..." />
        </Field>

        <Field label="Aplicación general / particular" className="md:col-span-2">
          <textarea value={form.aplicacion} onChange={e => set('aplicacion', e.target.value)}
            className="field-input resize-none" rows={2} />
        </Field>

      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="bg-blue-600 text-white rounded-lg px-5 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors">
          {saving ? 'Guardando...' : (lawId ? 'Guardar cambios' : 'Crear ley')}
        </button>
        <button type="button" onClick={() => router.back()}
          className="border border-slate-300 text-slate-600 rounded-lg px-5 py-2 text-sm hover:bg-slate-50 transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  )
}

function Field({ label, children, required, className }: {
  label: string; children: React.ReactNode; required?: boolean; className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
