import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const [lawRes, articlesRes] = await Promise.all([
    supabase.from('laws').select('*').eq('id', id).single(),
    supabase.from('articles').select('*').eq('law_id', id).order('created_at'),
  ])

  if (lawRes.error) return NextResponse.json({ error: lawRes.error.message }, { status: 404 })
  return NextResponse.json({ law: lawRes.data, articles: articlesRes.data ?? [] })
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  try { await supabase.rpc('set_app_user_email', { email: user.email ?? '' }) } catch {}

  const { data, error } = await supabase.from('laws').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try { await supabase.rpc('set_app_user_email', { email: user.email ?? '' }) } catch {}
  const { error } = await supabase.from('laws').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
