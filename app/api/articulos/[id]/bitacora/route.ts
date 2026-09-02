import { createDataClient } from '@/lib/supabase/data'
import { getSessionEmail } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = createDataClient()
  const { data, error } = await db
    .from('articulo_bitacora').select('*').eq('article_id', id)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { comentario } = await request.json()
  if (!comentario?.trim()) return NextResponse.json({ error: 'Comentario requerido' }, { status: 400 })

  const db = createDataClient()
  const { data: allowed } = await db.from('allowed_emails').select('nombre').eq('email', email).single()

  const { data, error } = await db.from('articulo_bitacora').insert({
    article_id: id,
    comentario: comentario.trim(),
    autor_email: email,
    autor_nombre: allowed?.nombre ?? null,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
