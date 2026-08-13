import { createDataClient as createClient } from '@/lib/supabase/data'
import Link from 'next/link'
import LawsFilter from '@/components/LawsFilter'
import ExpandableCell from '@/components/ExpandableCell'
import VigenciaStatus from '@/components/VigenciaStatus'
import { calcularImplementacion, colorImplementacion, menorFrecuencia } from '@/lib/law-metrics'
import type { Law } from '@/lib/types'

const PERIODOS: Record<string, number> = { mensual: 30, bianual: 60, trimestral: 90, semestral: 180, anual: 365 }

interface PageProps {
  searchParams: Promise<{ areas?: string; estados?: string; vigencias?: string; periodicidad?: string; q?: string }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = createClient()

  let query = supabase.from('laws').select('*').order('item', { ascending: true, nullsFirst: false })

  // Área
  if (params.areas) {
    const cats = params.areas.split(',').map(a => a.trim()).filter(Boolean)
    if (cats.length > 0 && cats.length < 3)
      query = query.or(cats.map(c => `area.ilike.%${c}%`).join(','))
  }

  // Estado (multi-select, incluye 'pendiente' como caso especial)
  if (params.estados) {
    const selectedEstados = params.estados.split(',').map(s => s.trim()).filter(Boolean)
    const dbEstados = selectedEstados.filter(e => e !== 'pendiente')
    const includePendiente = selectedEstados.includes('pendiente')

    if (includePendiente && dbEstados.length === 0) {
      // Solo pendiente: leyes vencidas
      const now = new Date()
      const overdueOr = Object.entries(PERIODOS).map(([p, d]) => {
        const cutoff = new Date(now.getTime() - d * 86400000).toISOString().slice(0, 10)
        return `and(periodicidad.ilike.${p},fecha_ultima_evaluacion.lt.${cutoff})`
      })
      query = query.or(overdueOr.join(','))
    } else if (!includePendiente && dbEstados.length > 0) {
      query = query.in('estado_cumplimiento', dbEstados)
    }
    // Si tiene ambos (pendiente + otros), no aplica filtro de DB (se muestra todo)
  }

  // Vigencia
  if (params.vigencias) {
    const vigs = params.vigencias.split(',').map(s => s.trim()).filter(Boolean)
    if (vigs.length === 1) {
      if (vigs[0] === 'no_vigente') query = query.eq('vigencia_estado', 'no_vigente')
      else query = query.neq('vigencia_estado', 'no_vigente')
    }
  }

  if (params.periodicidad) {
    const ps = params.periodicidad.split(',').map(s => s.trim()).filter(Boolean)
    if (ps.length === 1) query = query.eq('periodicidad', ps[0])
    else if (ps.length > 1) query = query.in('periodicidad', ps)
  }
  if (params.q) query = query.or(`codigo.ilike.%${params.q}%,descripcion.ilike.%${params.q}%,titular.ilike.%${params.q}%`)

  const { data: laws = [] } = await query
  const { data: allLaws = [] } = await supabase.from('laws').select('periodicidad')
  const periodicidades = [...new Set((allLaws ?? []).map((l: { periodicidad: string | null }) => l.periodicidad).filter(Boolean))].sort() as string[]

  const lawIds = (laws ?? []).map((l: Law) => l.id)
  const { data: articles = [] } = lawIds.length > 0
    ? await supabase.from('articles').select('law_id, cumple, parcial, no_cumple, na, frecuencia_evaluacion').in('law_id', lawIds)
    : { data: [] }
  const articlesByLaw = new Map<string, { cumple: boolean; parcial: boolean; na: boolean; frecuencia_evaluacion: string | null }[]>()
  for (const a of (articles ?? []) as { law_id: string; cumple: boolean; parcial: boolean; na: boolean; frecuencia_evaluacion: string | null }[]) {
    if (!articlesByLaw.has(a.law_id)) articlesByLaw.set(a.law_id, [])
    articlesByLaw.get(a.law_id)!.push(a)
  }

  const total = laws?.length ?? 0
  const cumple = laws?.filter(l => l.estado_cumplimiento === 'en_cumplimiento').length ?? 0
  const parcial = laws?.filter(l => l.estado_cumplimiento === 'en_implementacion').length ?? 0
  const noCumple = laws?.filter(l => l.estado_cumplimiento === 'no_cumple').length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Matriz de Identificación y Evaluación</h1>
          <p className="text-sm text-slate-500 mt-0.5">Requisitos Legales</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/leyes/export"
            className="border border-slate-300 text-slate-600 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-slate-50 transition-colors">
            Exportar Excel
          </a>
          <Link href="/leyes/nueva"
            className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700 transition-colors">
            + Nueva Ley
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: total, color: 'text-slate-800' },
          { label: 'Cumple', value: cumple, color: 'text-green-600' },
          { label: 'Parcial', value: parcial, color: 'text-yellow-600' },
          { label: 'No Cumple', value: noCumple, color: 'text-red-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <LawsFilter areas={[]} periodicidades={periodicidades} params={{ ...params }} />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs table-fixed">
          <colgroup>
            <col className="w-8" />
            <col className="w-[12%]" />
            <col className="w-[21%]" />
            <col className="w-[9%]" />
            <col className="w-[10%]" />
            <col className="w-[6%]" />
            <col className="w-[11%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-20" />
          </colgroup>
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-2 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
              <th className="px-2 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Código</th>
              <th className="px-2 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Descripción</th>
              <th className="px-2 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Área</th>
              <th className="px-2 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Mecanismo</th>
              <th className="px-2 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Period.</th>
              <th className="px-2 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Vigencia</th>
              <th className="px-2 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Última Eval.</th>
              <th className="px-2 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Implementación</th>
              <th className="px-2 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(laws ?? []).map((law: Law) => {
              const lawArticles = articlesByLaw.get(law.id) ?? []
              const pct = calcularImplementacion(lawArticles)
              const periodo = menorFrecuencia(lawArticles.map(a => a.frecuencia_evaluacion))
              return (
              <tr key={law.id} className="hover:bg-slate-50 transition-colors align-top">
                <td className="px-2 py-2.5 text-slate-400">{law.item}</td>
                <td className="px-2 py-2.5 font-medium text-slate-800 break-words">{law.codigo}</td>
                <td className="px-2 py-2.5"><ExpandableCell text={law.descripcion} /></td>
                <td className="px-2 py-2.5 text-slate-500 break-words">{law.area}</td>
                <td className="px-2 py-2.5 text-slate-500 break-words">{law.mecanismo_evaluacion}</td>
                <td className="px-2 py-2.5 text-slate-500">{periodo ?? <span className="text-slate-300">—</span>}</td>
                <td className="px-2 py-2.5">
                  <VigenciaStatus
                    id={law.id} codigo={law.codigo}
                    periodicidad={law.periodicidad} fecha_ultima_evaluacion={law.fecha_ultima_evaluacion}
                    vigencia_nota={law.vigencia_nota ?? null}
                    vigencia_estado={law.vigencia_estado ?? null}
                    vigencia_revisada_en={law.vigencia_revisada_en ?? null}
                    vigencia_modificada_en={law.vigencia_modificada_en ?? null}
                  />
                </td>
                <td className="px-2 py-2.5 text-slate-500">
                  {law.fecha_ultima_evaluacion
                    ? new Date(law.fecha_ultima_evaluacion).toLocaleDateString('es-CL')
                    : '—'}
                </td>
                <td className="px-2 py-2.5">
                  {pct !== null ? (
                    <>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${colorImplementacion(pct)}`}>{pct}%</span>
                      <div className="text-slate-400 mt-0.5">{lawArticles.length} artículo{lawArticles.length !== 1 ? 's' : ''}</div>
                    </>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-2 py-2.5">
                  <Link href={`/leyes/${law.id}`} className="inline-flex items-center gap-1 border border-blue-200 text-blue-600 rounded-lg px-3 py-1 text-xs font-medium hover:bg-blue-50 transition-colors whitespace-nowrap">
                    Ver →
                  </Link>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
        {(!laws || laws.length === 0) && (
          <div className="text-center py-12 text-slate-400">No se encontraron leyes</div>
        )}
      </div>
    </div>
  )
}

