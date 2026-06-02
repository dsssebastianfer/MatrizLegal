import { createDataClient } from '@/lib/supabase/data'
import { getSessionEmail } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const db = createDataClient()
  const [lawRes, articlesRes] = await Promise.all([
    db.from('laws').select('*').eq('id', id).single(),
    db.from('articles').select('*').eq('law_id', id).order('created_at'),
  ])
  if (lawRes.error) return NextResponse.json({ error: lawRes.error.message }, { status: 404 })
  return NextResponse.json({ law: lawRes.data, articles: articlesRes.data ?? [] })
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createDataClient()
  const body = await request.json()
  const { data, error } = await db.from('laws').update({ ...body, updated_by: email }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createDataClient()
  const { error } = await db.from('laws').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
