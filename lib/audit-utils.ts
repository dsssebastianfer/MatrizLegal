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
  'Verificación de vigencia': 'bg-emerald-100 text-emerald-700',
  'Se realizó revisión':   'bg-blue-100 text-blue-700',
  'Se adjuntó documento':  'bg-teal-100 text-teal-700',
  'Se quitó documento':    'bg-orange-100 text-orange-700',
  'Se agregó ley':         'bg-green-100 text-green-700',
  'Se eliminó ley':        'bg-red-100 text-red-700',
  'Se editó ley':          'bg-slate-100 text-slate-600',
  'Se agregó artículo':    'bg-green-100 text-green-700',
  'Se quitó artículo':     'bg-red-100 text-red-700',
  'Se editó artículo':     'bg-slate-100 text-slate-600',
}

export interface GroupedEvent {
  id: string
  timestamp: string
  usuario_email: string | null
  registro_id: string
  tabla: string
  descripcion: string
  changes: AuditLog[]
}

export function getDescripcion(items: AuditLog[]): string {
  const { tabla, accion } = items[0]
  if (accion === 'INSERT') return tabla === 'laws' ? 'Se agregó ley' : 'Se agregó artículo'
  if (accion === 'DELETE') return tabla === 'laws' ? 'Se eliminó ley' : 'Se quitó artículo'
  const campos = items.map(i => i.campo)
  // Vigencia tiene prioridad sobre revisión general
  if (campos.includes('vigencia_revisada_en') || campos.includes('vigencia_nota') || campos.includes('vigencia_estado'))
    return 'Verificación de vigencia'
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
      tabla: grp[0].tabla,
      descripcion: getDescripcion(grp),
      changes: grp,
    }
  })
}
