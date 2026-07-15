import { createDataClient as createClient } from '@/lib/supabase/data'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ReviewStatusBadge from '@/components/ReviewStatusBadge'
import LawDetailActions from '@/components/LawDetailActions'
import ArticlesTable from '@/components/ArticlesTable'
import DocumentSection from '@/components/DocumentSection'
import AuditPanel from '@/components/AuditPanel'
import type { Law, Article, AuditLog, LawDocument } from '@/lib/types'

type Params = { params: Promise<{ id: string }> }

export default async function LeyDetailPage({ params }: Params) {
  const { id } = await params
  const supabase = createClient()

  const [lawRes, articlesRes, docsRes] = await Promise.all([
    supabase.from('laws').select('*').eq('id', id).single(),
    supabase.from('articles').select('*').eq('law_id', id).order('created_at'),
    supabase.from('documents').select('*').eq('law_id', id).order('created_at'),
  ])

  if (lawRes.error || !lawRes.data) notFound()
  const law = lawRes.data as unknown as Law
  const articles = (articlesRes.data ?? []) as unknown as Article[]
  const documents = (docsRes.data ?? []) as unknown as LawDocument[]

  const articleIds = articles.map(a => a.id)
  const auditIds = [id, ...articleIds]
  const { data: auditData } = await supabase
    .from('audit_log').select('*').in('registro_id', auditIds)
    .order('created_at', { ascending: false }).limit(50)
  const auditItems = (auditData ?? []) as unknown as AuditLog[]

  const vigenciaTexto = !law.vigencia_revisada_en
    ? 'Vigencia no verificada'
    : `${law.vigencia_estado === 'no_vigente' ? 'No vigente' : 'Vigente'}. Revisado el ${new Date(law.vigencia_revisada_en).toLocaleDateString('es-CL')}`

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/" className="hover:text-blue-600">Leyes</Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">{law.codigo}</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-bold text-slate-800">{law.codigo}</h1>
              <ReviewStatusBadge
                id={law.id} codigo={law.codigo}
                periodicidad={law.periodicidad} fecha_ultima_evaluacion={law.fecha_ultima_evaluacion}
                estado_cumplimiento={law.estado_cumplimiento} observaciones={law.observaciones ?? null}
                vigencia_nota={law.vigencia_nota ?? null}
                vigencia_estado={law.vigencia_estado ?? null}
                vigencia_revisada_en={law.vigencia_revisada_en ?? null}
                vigencia_modificada_en={law.vigencia_modificada_en ?? null}
              />
            </div>
            <p className="text-slate-600 mb-4">{law.descripcion}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <InfoField label="Titular" value={law.titular} />
              <InfoField label="Área" value={law.area} />
              <InfoField label="Fecha Publicación" value={law.anio_publicacion} />
              <InfoField label="Mecanismo Evaluación" value={law.mecanismo_evaluacion} />
              <InfoField label="Periodicidad" value={law.periodicidad} />
              <InfoField label="Última Evaluación" value={
                law.fecha_ultima_evaluacion
                  ? new Date(law.fecha_ultima_evaluacion).toLocaleDateString('es-CL')
                  : null
              } />
              <InfoField label="Plan de Acción" value={law.plan_accion} />
              <InfoField label="Estado Plan" value={law.estado_plan_accion} />
              <InfoField label="Vigencia" value={vigenciaTexto} />
            </div>
            {law.aplicacion && (
              <div className="mt-3"><InfoField label="Aplicación" value={law.aplicacion} /></div>
            )}
            <div className="mt-4 flex items-center gap-3">
              <LawDetailActions
                id={law.id} codigo={law.codigo}
                periodicidad={law.periodicidad} fecha_ultima_evaluacion={law.fecha_ultima_evaluacion}
                vigencia_nota={law.vigencia_nota ?? null}
                vigencia_estado={law.vigencia_estado ?? null}
                vigencia_revisada_en={law.vigencia_revisada_en ?? null}
                vigencia_modificada_en={law.vigencia_modificada_en ?? null}
              />
              {law.vigencia_nota && (
                <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-green-500 text-sm">✓</span>
                  <p className="text-sm text-green-800">{law.vigencia_nota}</p>
                </div>
              )}
            </div>
            {law.observaciones && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700 font-medium uppercase tracking-wide mb-1">Observaciones</p>
                <p className="text-sm text-amber-900">{law.observaciones}</p>
              </div>
            )}
          </div>
          <Link href={`/leyes/${id}/editar`}
            className="shrink-0 border border-slate-300 text-slate-600 rounded-lg px-3 py-1.5 text-sm hover:bg-slate-50 transition-colors">
            Editar
          </Link>
        </div>
      </div>

      <DocumentSection lawId={id} documents={documents} documentosComentario={law.documentos_comentario ?? null} />

      <ArticlesTable articles={articles} lawId={id} />

      <AuditPanel items={auditItems} lawCodigo={law.codigo} />
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-slate-700 mt-0.5">{value || '—'}</p>
    </div>
  )
}
