export type EstadoCumplimiento = 'cumple' | 'parcial' | 'no_cumple' | 'na' | 'en_implementacion' | 'en_cumplimiento'

export interface Law {
  id: string
  item: number | null
  codigo: string
  titular: string | null
  anio_publicacion: string | null
  descripcion: string | null
  mecanismo_evaluacion: string | null
  fecha_ultima_evaluacion: string | null
  estado_cumplimiento: EstadoCumplimiento | null
  plan_accion: string | null
  estado_plan_accion: string | null
  observaciones: string | null
  vigencia_nota: string | null
  vigencia_estado: 'vigente' | 'no_vigente' | null
  vigencia_revisada_en: string | null
  vigencia_modificada_en: string | null
  periodicidad: string | null
  vigencia: string | null
  aplicacion: string | null
  area: string | null
  documento_nombre: string | null
  documento_url: string | null
  created_at: string
  updated_at: string
}

export interface Article {
  id: string
  law_id: string
  articulo: string | null
  ambito_aplicacion: string | null
  frecuencia_evaluacion: string | null
  cumple: boolean
  parcial: boolean
  no_cumple: boolean
  na: boolean
  registro_evidencia: string | null
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  tabla: string
  registro_id: string
  law_id: string | null
  accion: 'INSERT' | 'UPDATE' | 'DELETE'
  campo: string | null
  valor_anterior: string | null
  valor_nuevo: string | null
  usuario_email: string | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      laws: {
        Row: Law
        Insert: Omit<Law, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Law, 'id' | 'created_at' | 'updated_at'>>
      }
      articles: {
        Row: Article
        Insert: Omit<Article, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Article, 'id' | 'created_at' | 'updated_at'>>
      }
      audit_log: {
        Row: AuditLog
        Insert: never
        Update: never
      }
    }
  }
}
