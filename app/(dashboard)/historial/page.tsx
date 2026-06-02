import { createClient } from '@/lib/supabase/server'
import type { AuditLog, Law } from '@/lib/types'
import { groupAuditItems } from '@/lib/audit-utils'
import type { GroupedEvent } from '@/lib/audit-utils'
import HistorialTable from '@/components/HistorialTable'

export interface LawRef { item: number | null; codigo: string }
export interface GroupedEventWithLaw extends GroupedEvent { law: LawRef | null }

interface SearchParams { usuario?: string; ley?: string; desde?: string; hasta?: string }

export default async function HistorialPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const supabase = await createClient()

  // Si hay filtro por ley, primero resolvemos los IDs
  let filteredLawIds: string[] | null = null
  if (params.ley) {
    const { data: matchingLaws } = await supabase
      .from('laws').select('id').ilike('codigo', `%${params.ley}%`)
    filteredLawIds = (matchingLaws ?? []).map((l: { id: string }) => l.id)
    if (filteredLawIds.length === 0) filteredLawIds = ['no-match']
  }

  let query = supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (params.usuario) query = query.ilike('usuario_email', `%${params.usuario}%`)
  if (params.desde)   query = query.gte('created_at', params.desde)
  if (params.hasta)   query = query.lte('created_at', params.hasta + 'T23:59:59')
  if (filteredLawIds) query = query.in('registro_id', filteredLawIds)

  const { data: rawItems = [] } = await query
  const items = (rawItems ?? []) as unknown as AuditLog[]

  // Resolver leyes de laws y artículos en paralelo
  const allIds = [...new Set(items.map(i => i.registro_id))]
  const [{ data: rawLaws = [] }, { data: rawArticles = [] }] = await Promise.all([
    allIds.length > 0
      ? supabase.from('laws').select('id, item, codigo').in('id', allIds)
      : Promise.resolve({ data: [] }),
    allIds.length > 0
      ? supabase.from('articles').select('id, law_id').in('id', allIds)
      : Promise.resolve({ data: [] }),
  ])

  const lawMap: Record<string, LawRef> = {}
  for (const l of (rawLaws ?? []) as { id: string; item: number | null; codigo: string }[]) {
    lawMap[l.id] = { item: l.item, codigo: l.codigo }
  }

  const articleLawIds = [...new Set(
    (rawArticles ?? [] as { id: string; law_id: string }[])
      .filter((a): a is { id: string; law_id: string } => !!a.law_id)
      .map(a => a.law_id)
  )]
  if (articleLawIds.length > 0) {
    const { data: rawArtLaws = [] } = await supabase
      .from('laws').select('id, item, codigo').in('id', articleLawIds)
    const artLawMap: Record<string, LawRef> = {}
    for (const l of (rawArtLaws ?? []) as { id: string; item: number | null; codigo: string }[]) {
      artLawMap[l.id] = { item: l.item, codigo: l.codigo }
    }
    for (const a of (rawArticles ?? []) as { id: string; law_id: string }[]) {
      if (artLawMap[a.law_id]) lawMap[a.id] = artLawMap[a.law_id]
    }
  }

  const grouped: GroupedEventWithLaw[] = groupAuditItems(items).map(e => ({
    ...e,
    law: lawMap[e.registro_id] ?? null,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Historial de Cambios</h1>
        <span className="text-sm text-slate-500">{grouped.length} eventos</span>
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
    </div>
  )
}
