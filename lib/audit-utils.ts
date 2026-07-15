import type { AuditLog } from './types'

export const CAMPO_LABELS: Record<string, string> = {
  codigo: 'Código', titular: 'Titular', anio_publicacion: 'Año publicación',
  descripcion: 'Descripción', mecanismo_evaluacion: 'Mecanismo',
  fecha_ultima_evaluacion: 'Fecha evaluación', estado_cumplimiento: 'Estado',
  plan_accion: 'Descripción plan', estado_plan_accion: 'Estado plan',
  observaciones: 'Observaciones', periodicidad: 'Periodicidad',
  vigencia: 'Vigencia', aplicacion: 'Aplicación', area: 'Área',
  documento_nombre: 'Nombre doc.', documento_url: 'Documento',
  articulo: 'Artículo', ambito_aplicacion: 'Ámbito',
  frecuencia_evaluacion: 'Frecuencia', cumple: 'Cumple',
  parcial: 'Parcial', no_cumple: 'No Cumple', na: 'N/A',
  registro_evidencia: 'Evidencia',
}

export const DESC_STYLES: Record<string, string> = {
  'Verificación de vigencia':  'bg-emerald-100 text-emerald-700',
  'Se actualizó implementación': 'bg-violet-100 text-violet-700',
  'Se realizó revisión':       'bg-blue-100 text-blue-700',
  'Se adjuntó documento':  'bg-teal-100 text-teal-700',
  'Se quitó documento':    'bg-orange-100 text-orange-700',
  'Se agregó ley':         'bg-green-100 text-green-700',
  'Se eliminó ley':        'bg-red-100 text-red-700',
  'Se editó ley':          'bg-slate-100 text-slate-600',
  'Se agregó artículo':    'bg-green-100 text-green-700',
  'Se quitó artículo':     'bg-red-100 text-red-700',
  'Se editó artículo':     'bg-slate-100 text-slate-600',
}

export const TIPOS_CAMBIO = [
  'Se agregó ley', 'Se editó ley', 'Se eliminó ley',
  'Se agregó artículo', 'Se editó artículo', 'Se quitó artículo',
  'Verificación de vigencia', 'Se actualizó implementación', 'Se realizó revisión',
  'Se adjuntó documento', 'Se quitó documento',
]

const VIGENCIA_CAMPOS = ['vigencia_revisada_en', 'vigencia_nota', 'vigencia_estado']
const IMPLEMENTACION_CAMPOS = ['estado_cumplimiento', 'observaciones']
const ARTICULO_ESTADO_CAMPOS = ['cumple', 'parcial', 'no_cumple', 'na']
const LAW_CAMPOS_ESPECIALES = [...VIGENCIA_CAMPOS, ...IMPLEMENTACION_CAMPOS, 'fecha_ultima_evaluacion', 'documento_url']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyTipoFilter(query: any, tipo: string) {
  switch (tipo) {
    case 'Se agregó ley':      return query.eq('tabla', 'laws').eq('accion', 'INSERT')
    case 'Se eliminó ley':     return query.eq('tabla', 'laws').eq('accion', 'DELETE')
    case 'Se agregó artículo': return query.eq('tabla', 'articles').eq('accion', 'INSERT')
    case 'Se quitó artículo':  return query.eq('tabla', 'articles').eq('accion', 'DELETE')
    case 'Se editó artículo':
      return query.eq('tabla', 'articles').eq('accion', 'UPDATE').not('campo', 'in', `(${ARTICULO_ESTADO_CAMPOS.join(',')})`)
    case 'Se editó ley':
      return query.eq('tabla', 'laws').eq('accion', 'UPDATE').not('campo', 'in', `(${LAW_CAMPOS_ESPECIALES.join(',')})`)
    case 'Verificación de vigencia':
      return query.eq('tabla', 'laws').eq('accion', 'UPDATE').in('campo', VIGENCIA_CAMPOS)
    case 'Se actualizó implementación':
      return query.eq('accion', 'UPDATE').or(
        `and(tabla.eq.laws,campo.in.(${IMPLEMENTACION_CAMPOS.join(',')})),and(tabla.eq.articles,campo.in.(${ARTICULO_ESTADO_CAMPOS.join(',')}))`
      )
    case 'Se realizó revisión':
      return query.eq('tabla', 'laws').eq('accion', 'UPDATE').eq('campo', 'fecha_ultima_evaluacion')
    case 'Se adjuntó documento':
      return query.eq('tabla', 'laws').eq('accion', 'UPDATE').eq('campo', 'documento_url')
        .not('valor_nuevo', 'is', null).neq('valor_nuevo', '')
    case 'Se quitó documento':
      return query.eq('tabla', 'laws').eq('accion', 'UPDATE').eq('campo', 'documento_url')
        .or('valor_nuevo.is.null,valor_nuevo.eq.')
    default: return query
  }
}

export interface GroupedEvent {
  id: string
  timestamp: string
  usuario_email: string | null
  registro_id: string
  law_id: string | null
  tabla: string
  descripcion: string
  articulo_ref: string | null
  changes: AuditLog[]
}

export function getDescripcion(items: AuditLog[]): string {
  const { tabla, accion } = items[0]
  if (accion === 'INSERT') return tabla === 'laws' ? 'Se agregó ley' : 'Se agregó artículo'
  if (accion === 'DELETE') return tabla === 'laws' ? 'Se eliminó ley' : 'Se quitó artículo'
  const campos = items.map(i => i.campo)
  // Vigencia tiene máxima prioridad
  if (campos.includes('vigencia_revisada_en') || campos.includes('vigencia_nota') || campos.includes('vigencia_estado'))
    return 'Verificación de vigencia'
  // Cambio de implementación (estado/observaciones de la ley, o cumple/parcial/no_cumple/na de un artículo)
  if (campos.includes('estado_cumplimiento') || campos.includes('observaciones'))
    return 'Se actualizó implementación'
  if (tabla === 'articles' && campos.some(c => ARTICULO_ESTADO_CAMPOS.includes(c ?? '')))
    return 'Se actualizó implementación'
  if (campos.includes('fecha_ultima_evaluacion')) return 'Se realizó revisión'
  if (campos.includes('documento_url')) {
    const d = items.find(i => i.campo === 'documento_url')
    return d?.valor_nuevo ? 'Se adjuntó documento' : 'Se quitó documento'
  }
  return tabla === 'laws' ? 'Se editó ley' : 'Se editó artículo'
}

export function groupAuditItems(items: AuditLog[]): GroupedEvent[] {
  const groups: Record<string, AuditLog[]> = {}
  const order: string[] = []

  for (const item of items) {
    const bucket = Math.floor(new Date(item.created_at).getTime() / 10000)
    const accionKey = item.accion === 'UPDATE' ? 'U' : item.accion
    const key = `${item.registro_id}|${item.usuario_email ?? ''}|${item.tabla}|${accionKey}|${bucket}`
    if (!groups[key]) { groups[key] = []; order.push(key) }
    groups[key].push(item)
  }

  return order.map(key => {
    const grp = groups[key]
    return {
      id: key,
      timestamp: grp[0].created_at,
      usuario_email: grp[0].usuario_email,
      registro_id: grp[0].registro_id,
      law_id: grp[0].law_id ?? null,
      tabla: grp[0].tabla,
      descripcion: getDescripcion(grp),
      articulo_ref: grp.find(i => i.articulo_ref)?.articulo_ref ?? null,
      changes: grp,
    }
  })
}
