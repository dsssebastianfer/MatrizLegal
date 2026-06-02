'use client'

import { useState, useRef, useEffect } from 'react'

interface Option { value: string; label: string }

interface Props {
  label: string
  options: Option[]
  selected: string[]           // valores activos; vacío = todos
  onChange: (values: string[]) => void
}

export default function FilterDropdown({ label, options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Cerrar al click fuera
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  // Vacío = todos seleccionados
  const allSelected = selected.length === 0 || selected.length === options.length
  const activeCount = allSelected ? options.length : selected.length
  const hasFilter = !allSelected

  function isChecked(value: string) {
    return allSelected || selected.includes(value)
  }

  function toggle(value: string) {
    if (allSelected) {
      // Empezar quitando solo este
      onChange(options.map(o => o.value).filter(v => v !== value))
    } else {
      const next = selected.includes(value)
        ? selected.filter(v => v !== value)
        : [...selected, value]
      // Si quedan todos → limpiar filtro
      onChange(next.length === options.length ? [] : next)
    }
  }

  function selectAll() { onChange([]) }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition-colors ${
          hasFilter
            ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
            : 'border-slate-300 text-slate-600 hover:bg-slate-50'
        }`}
      >
        <span>{label}</span>
        {hasFilter && (
          <span className="bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {activeCount}
          </span>
        )}
        <span className="text-slate-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 min-w-48 py-1">
          {/* Seleccionar todo */}
          <label className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={selectAll}
              className="w-3.5 h-3.5 accent-blue-600"
            />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Todos</span>
          </label>

          {options.map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={isChecked(opt.value)}
                onChange={() => toggle(opt.value)}
                className="w-3.5 h-3.5 accent-blue-600"
              />
              <span className="text-sm text-slate-700">{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
