import { createDataClient } from '@/lib/supabase/data'
import { getSessionEmail } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createDataClient()
  const body = await request.json()
  try { await db.rpc('set_app_user_email', { email }) } catch {}
  const { data, error } = await db.from('articles').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createDataClient()
  try { await db.rpc('set_app_user_email', { email }) } catch {}
  const { error } = await db.from('articles').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
