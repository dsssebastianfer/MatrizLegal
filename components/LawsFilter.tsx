'use client'

import { useRouter, usePathname } from 'next/navigation'
import FilterDropdown from './FilterDropdown'

const AREAS_OPTIONS = [
  { value: 'Calidad', label: 'Calidad' },
  { value: 'Ambiente', label: 'Ambiente' },
  { value: 'S&ST', label: 'S&ST' },
]

const ESTADOS_OPTIONS = [
  { value: 'en_cumplimiento',   label: 'En Cumplimiento' },
  { value: 'pendiente',         label: 'Pendiente' },
  { value: 'en_implementacion', label: 'En Implementación' },
  { value: 'no_cumple',         label: 'No Cumplimiento' },
]

const VIGENCIA_OPTIONS = [
  { value: 'vigente',    label: 'Vigente' },
  { value: 'no_vigente', label: 'No vigente' },
]

interface Props {
  areas: string[]
  periodicidades: string[]
  params: { areas?: string; estados?: string; vigencias?: string; periodicidad?: string; q?: string }
}

function parseList(param?: string): string[] {
  if (!param) return []
  return param.split(',').map(s => s.trim()).filter(Boolean)
}

export default function LawsFilter({ periodicidades, params }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function buildUrl(updates: Record<string, string | undefined>) {
    const sp = new URLSearchParams()
    const merged = { ...params, ...updates }
    for (const [k, v] of Object.entries(merged)) {
      if (v) sp.set(k, v)
    }
    const qs = sp.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  function handleAreas(values: string[]) {
    router.push(buildUrl({ areas: values.length ? values.join(',') : undefined }))
  }

  function handleEstados(values: string[]) {
    router.push(buildUrl({ estados: values.length ? values.join(',') : undefined }))
  }

  function handleVigencias(values: string[]) {
    router.push(buildUrl({ vigencias: values.length ? values.join(',') : undefined }))
  }

  function handlePeriodicidad(values: string[]) {
    router.push(buildUrl({ periodicidad: values.length ? values.join(',') : undefined }))
  }

  const periodicidadOptions = periodicidades.map(p => ({ value: p, label: p }))

  const hasFilters = !!(params.areas || params.estados || params.vigencias || params.periodicidad || params.q)

  return (
    <div className="flex flex-wrap gap-2 items-center bg-white rounded-xl border border-slate-200 p-4">
      {/* Búsqueda */}
      <input
        type="text"
        placeholder="Buscar por código o descripción..."
        defaultValue={params.q ?? ''}
        onChange={e => {
          const val = e.target.value
          router.push(buildUrl({ q: val || undefined }))
        }}
        className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <FilterDropdown
        label="Área"
        options={AREAS_OPTIONS}
        selected={parseList(params.areas)}
        onChange={handleAreas}
      />

      <FilterDropdown
        label="Estado"
        options={ESTADOS_OPTIONS}
        selected={parseList(params.estados)}
        onChange={handleEstados}
      />

      <FilterDropdown
        label="Vigencia"
        options={VIGENCIA_OPTIONS}
        selected={parseList(params.vigencias)}
        onChange={handleVigencias}
      />

      <FilterDropdown
        label="Periodicidad"
        options={periodicidadOptions}
        selected={parseList(params.periodicidad)}
        onChange={handlePeriodicidad}
      />

      {hasFilters && (
        <button onClick={() => router.push(pathname)}
          className="text-xs text-slate-500 hover:text-red-600 px-2 py-1.5">
          ✕ Limpiar
        </button>
      )}
    </div>
  )
}
