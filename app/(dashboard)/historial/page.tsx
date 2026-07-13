import { createDataClient as createClient } from '@/lib/supabase/data'
import Link from 'next/link'
import type { AuditLog } from '@/lib/types'
import { groupAuditItems } from '@/lib/audit-utils'
import type { GroupedEvent } from '@/lib/audit-utils'
import HistorialTable from '@/components/HistorialTable'

export interface LawRef { item: number | null; codigo: string }
export interface GroupedEventWithLaw extends GroupedEvent { law: LawRef | null }

const PAGE_SIZE = 100

interface SearchParams { usuario?: string; ley?: string; desde?: string; hasta?: string; page?: string }

function pageHref(params: SearchParams, page: number) {
  const sp = new URLSearchParams()
  if (params.usuario) sp.set('usuario', params.usuario)
  if (params.ley) sp.set('ley', params.ley)
  if (params.desde) sp.set('desde', params.desde)
  if (params.hasta) sp.set('hasta', params.hasta)
  if (page > 1) sp.set('page', String(page))
  const qs = sp.toString()
  return `/historial${qs ? `?${qs}` : ''}`
}

export default async function HistorialPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const supabase = createClient()

  // Si hay filtro por ley, resolver IDs coincidentes
  let filteredLawIds: string[] | null = null
  if (params.ley) {
    const { data: matchingLaws } = await supabase
      .from('laws').select('id').ilike('codigo', `%${params.ley}%`)
    filteredLawIds = (matchingLaws ?? []).map((l: { id: string }) => l.id)
    if (filteredLawIds.length === 0) filteredLawIds = ['no-match']
  }

  let query = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (params.usuario) query = query.ilike('usuario_email', `%${params.usuario}%`)
  if (params.desde)   query = query.gte('created_at', params.desde)
  if (params.hasta)   query = query.lte('created_at', params.hasta + 'T23:59:59')
  if (filteredLawIds) {
    const ids = filteredLawIds.join(',')
    query = query.or(`registro_id.in.(${ids}),law_id.in.(${ids})`)
  }

  const { data: rawItems = [], count } = await query
  const items = (rawItems ?? []) as unknown as AuditLog[]
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  // IDs de leyes directos (eventos de laws) + law_ids de artículos nuevos (con columna law_id)
  const directLawIds = [...new Set([
    ...items.filter(i => i.tabla === 'laws').map(i => i.registro_id),
    ...items.filter(i => i.tabla === 'articles' && i.law_id).map(i => i.law_id!),
  ])]
  // Artículos sin law_id (registros viejos): necesitan lookup via tabla articles
  const articleIdsWithoutLawId = items
    .filter(i => i.tabla === 'articles' && !i.law_id)
    .map(i => i.registro_id)

  const [{ data: rawLaws = [] }, { data: rawFallbackArticles = [] }] = await Promise.all([
    directLawIds.length > 0
      ? supabase.from('laws').select('id, item, codigo').in('id', directLawIds)
      : Promise.resolve({ data: [] }),
    articleIdsWithoutLawId.length > 0
      ? supabase.from('articles').select('id, law_id').in('id', articleIdsWithoutLawId)
      : Promise.resolve({ data: [] }),
  ])

  const lawMap: Record<string, LawRef> = {}
  for (const l of (rawLaws ?? []) as { id: string; item: number | null; codigo: string }[]) {
    lawMap[l.id] = { item: l.item, codigo: l.codigo }
  }

  // Fallback para registros viejos sin law_id: buscar la ley del artículo
  const fallbackArticles = (rawFallbackArticles ?? []) as { id: string; law_id: string }[]
  if (fallbackArticles.length > 0) {
    const fallbackLawIds = [...new Set(fallbackArticles.map(a => a.law_id).filter(Boolean))]
    if (fallbackLawIds.length > 0) {
      const { data: fallbackLaws } = await supabase
        .from('laws').select('id, item, codigo').in('id', fallbackLawIds)
      for (const l of (fallbackLaws ?? []) as { id: string; item: number | null; codigo: string }[]) {
        lawMap[l.id] = { item: l.item, codigo: l.codigo }
      }
      for (const a of fallbackArticles) {
        if (a.law_id && lawMap[a.law_id]) lawMap[a.id] = lawMap[a.law_id]
      }
    }
  }

  const grouped: GroupedEventWithLaw[] = groupAuditItems(items).map(e => {
    const resolvedId = e.tabla === 'laws' ? e.registro_id : (e.law_id ?? e.registro_id)
    return { ...e, law: lawMap[resolvedId] ?? null }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Historial de Cambios</h1>
        <span className="text-sm text-slate-500">{count ?? 0} cambios en total</span>
      </div>

      <form className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Ley</label>
          <input name="ley" defaultValue={params.ley} placeholder="Código de ley..."
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Usuario</label>
          <input name="usuario" defaultValue={params.usuario} placeholder="Email..."
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Desde</label>
          <input type="date" name="desde" defaultValue={params.desde}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Hasta</label>
          <input type="date" name="hasta" defaultValue={params.hasta}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button type="submit"
          className="bg-blue-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-blue-700 transition-colors">
          Filtrar
        </button>
        {(params.usuario || params.ley || params.desde || params.hasta) && (
          <a href="/historial" className="text-xs text-slate-500 hover:text-red-600 px-2 py-1.5">✕ Limpiar</a>
        )}
      </form>

      <HistorialTable events={grouped} />

      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">Página {page} de {totalPages}</span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link href={pageHref(params, page - 1)}
              className="text-sm font-medium text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors">
              ← Anterior
            </Link>
          ) : (
            <span className="text-sm font-medium text-slate-300 border border-slate-200 rounded-lg px-3 py-1.5">← Anterior</span>
          )}
          {page < totalPages ? (
            <Link href={pageHref(params, page + 1)}
              className="text-sm font-medium text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors">
              Siguiente →
            </Link>
          ) : (
            <span className="text-sm font-medium text-slate-300 border border-slate-200 rounded-lg px-3 py-1.5">Siguiente →</span>
          )}
        </div>
      </div>
    </div>
  )
}
